import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    const results = { processed: 0, created: 0, updated: 0, errors: [] };

    // Fetch all active calculated KPIs
    const kpis = await base44.asServiceRole.entities.KPI.filter({ is_active: true, type: "calculated" });

    for (const kpi of kpis) {
      try {
        await processKPI(base44, kpi, results);
        results.processed++;
      } catch (error) {
        results.errors.push({ kpi_id: kpi.id, kpi_name: kpi.name, error: error.message });
      }
    }

    return Response.json({ success: true, message: `Processed ${results.processed} KPIs`, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processKPI(base44, kpi, results) {
  const { source_entity, metric_field, date_field, aggregation_method, filter_conditions, responsible_user_field, reporting_period_type, threshold_comparison, threshold_value, target_value } = kpi;

  if (!source_entity || !base44.asServiceRole.entities[source_entity]) {
    throw new Error(`Invalid source entity: ${source_entity}`);
  }

  const periodDates = getReportingPeriod(reporting_period_type);
  
  // Build query filters
  const queryFilters = { ...(filter_conditions || {}) };
  
  // For date filtering, we fetch all records and filter in code since
  // complex date range queries may not be supported on all field types
  let sourceData;
  try {
    sourceData = await base44.asServiceRole.entities[source_entity].filter(queryFilters);
  } catch (e) {
    // If filter fails (e.g. unsupported operator), try listing all
    sourceData = await base44.asServiceRole.entities[source_entity].filter({});
    // Apply filter conditions manually
    if (filter_conditions && Object.keys(filter_conditions).length > 0) {
      sourceData = sourceData.filter(record => {
        return Object.entries(filter_conditions).every(([key, val]) => {
          if (typeof val === 'object' && val !== null) return true; // Skip complex filters
          return record[key] === val;
        });
      });
    }
  }

  // Apply date range filter in code for reliability
  if (date_field) {
    sourceData = sourceData.filter(record => {
      const dateVal = record[date_field];
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d >= periodDates.start && d <= periodDates.end;
    });
  }

  // Group by responsible user
  const userGroups = {};
  for (const record of sourceData) {
    const userId = record[responsible_user_field];
    if (!userId) continue;
    if (!userGroups[userId]) userGroups[userId] = [];
    userGroups[userId].push(record);
  }

  // Also handle assigned users who may have zero records
  if (kpi.assigned_user_ids && kpi.assigned_user_ids.length > 0) {
    for (const uid of kpi.assigned_user_ids) {
      if (!userGroups[uid]) userGroups[uid] = [];
    }
  }

  // Calculate KPI for each user
  for (const [userId, records] of Object.entries(userGroups)) {
    const actualValue = calculateAggregation(records, metric_field, aggregation_method);
    
    // Get user-specific target if exists
    let targetValueAtEntry = target_value;
    try {
      const targets = await base44.asServiceRole.entities.KPITarget.filter({
        kpi_id: kpi.id,
        user_id: userId,
      });
      const matchingTarget = targets.find(t => {
        const tStart = new Date(t.reporting_period_start_date);
        const tEnd = new Date(t.reporting_period_end_date);
        return tStart <= periodDates.end && tEnd >= periodDates.start;
      });
      if (matchingTarget) targetValueAtEntry = matchingTarget.target_value;
    } catch (e) {
      // Use default target
    }
    
    const isFlagged = checkThreshold(actualValue, threshold_value, threshold_comparison);
    
    // Upsert entry
    const existingEntries = await base44.asServiceRole.entities.KPIEntry.filter({
      kpi_id: kpi.id,
      user_id: userId,
    });
    
    const existing = existingEntries.find(e => {
      const eStart = new Date(e.reporting_period_start_date);
      const eEnd = new Date(e.reporting_period_end_date);
      return eStart.toDateString() === periodDates.start.toDateString() && eEnd.toDateString() === periodDates.end.toDateString();
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

    if (existing) {
      await base44.asServiceRole.entities.KPIEntry.update(existing.id, {
        ...entryData,
        explanation_provided: existing.explanation_provided
      });
      results.updated++;
    } else {
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
      start.setDate(start.getDate() - start.getDay());
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
  if (method === 'count') return records.length;
  
  const values = records
    .map(r => typeof r[metricField] === 'number' ? r[metricField] : parseFloat(r[metricField]))
    .filter(v => !isNaN(v));

  if (values.length === 0) return 0;

  switch (method) {
    case 'sum': return values.reduce((s, v) => s + v, 0);
    case 'average': return values.reduce((s, v) => s + v, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    default: return 0;
  }
}

function checkThreshold(actualValue, thresholdValue, comparison) {
  if (thresholdValue == null || !comparison) return false;
  switch (comparison) {
    case 'less_than': return actualValue < thresholdValue;
    case 'greater_than': return actualValue > thresholdValue;
    case 'equal_to': return actualValue === thresholdValue;
    case 'not_equal_to': return actualValue !== thresholdValue;
    default: return false;
  }
}