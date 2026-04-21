/**
 * Entity automation handler: when a PreconProgress record is created or updated,
 * scan its form_data for financial fields and sync totals back to the Lead entity.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Financial field keys per stage that should trigger a sync
const FINANCIAL_STAGES = {
  1: ['estimated_precon_value', 'estimated_construction_value'],
  6: ['total_estimated_cost'],
  8: ['precon_fee'],
  18: ['total_hard_costs', 'total_soft_costs', 'contingency_pct'],
  19: ['original_estimate', 'savings_accepted'],
  20: ['final_budget'],
  33: ['contract_value'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data?.lead_id || !data?.stage_id) {
      return Response.json({ skipped: true, reason: 'missing lead_id or stage_id' });
    }

    // Get stages to find this one's order
    const stages = await base44.asServiceRole.entities.PreconStage.list('stage_order', 200);
    const stageOrderMap = {};
    stages.forEach(s => { stageOrderMap[s.id] = s.stage_order; });
    const stageOrder = stageOrderMap[data.stage_id];
    console.log('Stage order:', stageOrder, 'for stage_id:', data.stage_id);

    if (!stageOrder || !FINANCIAL_STAGES[stageOrder]) {
      return Response.json({ skipped: true, reason: 'not a financial stage' });
    }

    // Check if the form_data has any of the tracked financial fields
    const fd = data.form_data || {};
    const relevantFields = FINANCIAL_STAGES[stageOrder];
    const hasFinancialData = relevantFields.some(key => fd[key] !== undefined && fd[key] !== '' && fd[key] !== null);

    if (!hasFinancialData) {
      return Response.json({ skipped: true, reason: 'no financial data in form' });
    }

    // Calculate the best current financial values from ALL progress for this lead
    const allProgressRaw = await base44.asServiceRole.entities.PreconProgress.list('-created_date', 500);
    const allProgress = allProgressRaw.filter(p => p.lead_id === data.lead_id);

    let estimatedPreconValue = null;
    let estimatedConstructionValue = null;

    for (const prog of allProgress) {
      const order = stageOrderMap[prog.stage_id];
      const pfd = prog.form_data || {};

      if (order === 1) {
        if (pfd.estimated_precon_value) estimatedPreconValue = parseFloat(pfd.estimated_precon_value) || estimatedPreconValue;
        if (pfd.estimated_construction_value) estimatedConstructionValue = parseFloat(pfd.estimated_construction_value) || estimatedConstructionValue;
      }
      if (order === 6 && pfd.total_estimated_cost) {
        estimatedConstructionValue = parseFloat(pfd.total_estimated_cost) || estimatedConstructionValue;
      }
      if (order === 8 && pfd.precon_fee) {
        estimatedPreconValue = parseFloat(pfd.precon_fee) || estimatedPreconValue;
      }
      if (order === 18 && pfd.total_hard_costs) {
        const hard = parseFloat(pfd.total_hard_costs) || 0;
        const soft = parseFloat(pfd.total_soft_costs) || 0;
        const pct = parseFloat(pfd.contingency_pct) || 0;
        const total = hard + soft + (hard * pct / 100);
        if (total > 0) estimatedConstructionValue = total;
      }
      if (order === 19) {
        const orig = parseFloat(pfd.original_estimate) || 0;
        const savings = parseFloat(pfd.savings_accepted) || 0;
        if (orig > 0) estimatedConstructionValue = orig - savings;
      }
      if (order === 20 && pfd.final_budget) {
        estimatedConstructionValue = parseFloat(pfd.final_budget) || estimatedConstructionValue;
      }
      if (order === 33 && pfd.contract_value) {
        estimatedConstructionValue = parseFloat(pfd.contract_value) || estimatedConstructionValue;
      }
    }

    // Update the Lead entity with latest financial data
    const updateData = {};
    if (estimatedPreconValue !== null) updateData.estimated_precon_value = estimatedPreconValue;
    if (estimatedConstructionValue !== null) updateData.estimated_construction_value = estimatedConstructionValue;

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.Lead.update(data.lead_id, updateData);
      console.log(`Synced financials to Lead ${data.lead_id}:`, updateData);
    }

    return Response.json({
      success: true,
      lead_id: data.lead_id,
      synced: updateData,
    });
  } catch (error) {
    console.error('preconFinancialSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});