import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user (should be admin or system)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    // Fetch all active calculated KPIs
    const kpis = await base44.asServiceRole.entities.KPI.filter({ 
      is_active: true, 
      type: "calculated" 
    });

    for (const kpi of kpis) {
      try {
        await processKPI(base44, kpi, results);
        results.processed++;
      } catch (error) {
        results.errors.push({
          kpi_id: kpi.id,
          kpi_name: kpi.name,
          error: error.message
        });
      }
    }

    return Response.json({ 
      success: true, 
      message: `Processed ${results.processed} KPIs`,
      results 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processKPI(base44, kpi, results) {
  const { 
    source_entity, 
    metric_field, 
    date_field, 
    aggregation_method,
    filter_conditions,
    responsible_user_field,
    reporting_period_type,
    threshold_comparison,
    threshold_value,
    target_value
  } = kpi;

  // Calculate reporting period dates
  const periodDates = getReportingPeriod(reporting_period_type);
  
  // Fetch source data with filters
  const queryFilters = { ...filter_conditions };
  
  // Add date range filter if date_field is specified
  if (date_field) {
    queryFilters[date_field] = {
      $gte: periodDates.start.toISOString(),
      $lte: periodDates.end.toISOString()
    };
  }

  const sourceData = await base44.asServiceRole.entities[source_entity].filter(queryFilters);

  // Group by responsible user
  const userGroups = {};
  
  for (const record of sourceData) {
    const userId = record[responsible_user_field];
    if (!userId) continue;
    
    if (!userGroups[userId]) {
      userGroups[userId] = [];
    }
    userGroups[userId].push(record);
  }

  // Calculate KPI for each user
  for (const [userId, records] of Object.entries(userGroups)) {
    const actualValue = calculateAggregation(records, metric_field, aggregation_method);
    
    // Get target for this user/period
    const targets = await base44.asServiceRole.entities.KPITarget.filter({
      kpi_id: kpi.id,
      user_id: userId,
      reporting_period_start_date: { $lte: periodDates.end.toISOString() },
      reporting_period_end_date: { $gte: periodDates.start.toISOString() }
    });
    
    const targetValueAtEntry = targets.length > 0 ? targets[0].target_value : target_value;
    
    // Check if flagged
    const isFlagged = checkThreshold(actualValue, threshold_value, threshold_comparison);
    
    // Check if entry already exists
    const existingEntries = await base44.asServiceRole.entities.KPIEntry.filter({
      kpi_id: kpi.id,
      user_id: userId,
      reporting_period_start_date: periodDates.start.toISOString(),
      reporting_period_end_date: periodDates.end.toISOString()
    });

    const entryData = {
      kpi_id: kpi.id,
      user_id: userId,
      reporting_period_start_date: periodDates.start.toISOString(),
      reporting_period_end_date: periodDates.end.toISOString(),
      actual_value: actualValue,
      target_value_at_entry: targetValueAtEntry,
      is_flagged: isFlagged,
      source_data_ids: records.map(r => r.id),
      manual_entry: false
    };

    if (existingEntries.length > 0) {
      // Update existing entry (preserve explanation if exists)
      const existing = existingEntries[0];
      await base44.asServiceRole.entities.KPIEntry.update(existing.id, {
        ...entryData,
        explanation_provided: existing.explanation_provided // Preserve existing explanation
      });
      results.updated++;
    } else {
      // Create new entry
      await base44.asServiceRole.entities.KPIEntry.create(entryData);
      results.created++;
    }
  }
}

function getReportingPeriod(periodType) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (periodType) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(quarter * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

function calculateAggregation(records, metricField, method) {
  const values = records.map(r => {
    const val = r[metricField];
    return typeof val === 'number' ? val : (val ? 1 : 0);
  });

  switch (method) {
    case 'count':
      return records.length;
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0);
    case 'average':
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    case 'min':
      return values.length > 0 ? Math.min(...values) : 0;
    case 'max':
      return values.length > 0 ? Math.max(...values) : 0;
    default:
      return 0;
  }
}

function checkThreshold(actualValue, thresholdValue, comparison) {
  if (!thresholdValue || !comparison) return false;

  switch (comparison) {
    case 'less_than':
      return actualValue < thresholdValue;
    case 'greater_than':
      return actualValue > thresholdValue;
    case 'equal_to':
      return actualValue === thresholdValue;
    case 'not_equal_to':
      return actualValue !== thresholdValue;
    default:
      return false;
  }
}