/**
 * Phase 4 – Pre-Con Co-Pilot Background Monitor
 * Runs on a daily schedule to scan all active precon projects and generate
 * nudges, risk flags, and draft suggestions. Results are stored as
 * PreconCopilotAlert records for in-app display.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all data
    const [leads, stages, allProgress, clients, sales] = await Promise.all([
      base44.asServiceRole.entities.Lead.list('-created_date', 500),
      base44.asServiceRole.entities.PreconStage.list('stage_order', 200),
      base44.asServiceRole.entities.PreconProgress.list('-created_date', 5000),
      base44.asServiceRole.entities.Client.list('-created_date', 500),
      base44.asServiceRole.entities.Sale.list('-created_date', 500),
    ]);

    const activeStages = stages.filter(s => s.is_active !== false).sort((a, b) => a.stage_order - b.stage_order);
    
    // Find leads with active precon (have at least one progress record)
    const leadsWithPrecon = new Set(allProgress.map(p => p.lead_id));
    const activeLeads = leads.filter(l => leadsWithPrecon.has(l.id) && l.status !== 'disqualified');

    const alerts = [];

    for (const lead of activeLeads) {
      const leadProgress = allProgress.filter(p => p.lead_id === lead.id);
      const progressMap = {};
      leadProgress.forEach(p => { progressMap[p.stage_id] = p; });
      
      const client = clients.find(c => c.id === lead.client_id);
      const sale = lead.converted_to_sale_id ? sales.find(s => s.id === lead.converted_to_sale_id) : null;

      // Determine project start date
      const projectStartDate = leadProgress.length > 0
        ? leadProgress.reduce((min, p) => (!min || p.created_date < min) ? p.created_date : min, null)
        : lead.created_date;

      // Build completion dates for due date calc
      const completionDates = {};
      activeStages.forEach(s => {
        const p = progressMap[s.id];
        if (p?.completed_at) completionDates[s.stage_order] = p.completed_at;
      });

      for (const stage of activeStages) {
        const prog = progressMap[stage.id];
        const status = prog?.status || 'not_started';
        if (status === 'complete' || status === 'skipped') continue;

        // 1. Overdue check
        if (stage.due_date_logic && projectStartDate) {
          const dueDate = calculateDueDateSimple(stage.due_date_logic, projectStartDate, completionDates);
          if (dueDate && new Date() > dueDate) {
            const daysOverdue = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
            alerts.push({
              lead_id: lead.id,
              lead_title: lead.title,
              client_name: client?.contact_name || 'Unknown',
              stage_order: stage.stage_order,
              stage_name: stage.stage_name,
              alert_type: 'overdue',
              severity: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
              message: `Stage ${stage.stage_order} "${stage.stage_name}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due.`,
              suggestion: `Consider reviewing this stage and updating progress. ${stage.raci_responsible ? `Responsible: ${stage.raci_responsible}` : ''}`,
            });
          }
        }

        // 2. Missing required fields (in-progress stages)
        if (status === 'in_progress') {
          const missingFields = checkRequiredFieldsSimple(stage.stage_order, prog?.form_data);
          if (missingFields.length > 0) {
            alerts.push({
              lead_id: lead.id,
              lead_title: lead.title,
              client_name: client?.contact_name || 'Unknown',
              stage_order: stage.stage_order,
              stage_name: stage.stage_name,
              alert_type: 'missing_fields',
              severity: missingFields.length > 3 ? 'medium' : 'low',
              message: `Stage ${stage.stage_order} has ${missingFields.length} required field${missingFields.length !== 1 ? 's' : ''} incomplete: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? '...' : ''}.`,
              suggestion: `Complete the deliverable form to unblock stage completion.`,
            });
          }

          // 3. Missing approval on gate stages
          if (stage.approval_gate && prog?.approval_status !== 'approved') {
            alerts.push({
              lead_id: lead.id,
              lead_title: lead.title,
              client_name: client?.contact_name || 'Unknown',
              stage_order: stage.stage_order,
              stage_name: stage.stage_name,
              alert_type: 'missing_approval',
              severity: 'medium',
              message: `Stage ${stage.stage_order} "${stage.stage_name}" (${stage.approval_gate} gate) needs approval.`,
              suggestion: `Review the deliverable and mark as approved to unblock completion.`,
            });
          }
        }

        // 4. Budget drift detection (compare across financial stages)
        if (status === 'in_progress' && [18, 19, 20].includes(stage.stage_order)) {
          const stage6Prog = leadProgress.find(p => {
            const so = activeStages.find(s => s.id === p.stage_id)?.stage_order;
            return so === 6;
          });
          const currentBudget = getLatestBudget(stage.stage_order, prog?.form_data);
          const prelimBudget = stage6Prog?.form_data?.total_estimated_cost ? parseFloat(stage6Prog.form_data.total_estimated_cost) : null;
          
          if (currentBudget && prelimBudget && prelimBudget > 0) {
            const drift = ((currentBudget - prelimBudget) / prelimBudget) * 100;
            if (Math.abs(drift) > 5) {
              alerts.push({
                lead_id: lead.id,
                lead_title: lead.title,
                client_name: client?.contact_name || 'Unknown',
                stage_order: stage.stage_order,
                stage_name: stage.stage_name,
                alert_type: 'budget_drift',
                severity: Math.abs(drift) > 15 ? 'high' : 'medium',
                message: `Budget drift of ${drift > 0 ? '+' : ''}${drift.toFixed(1)}% detected vs preliminary budget ($${prelimBudget.toLocaleString()} → $${currentBudget.toLocaleString()}).`,
                suggestion: `Review the variance and determine if value engineering or client re-alignment is needed.`,
              });
            }
          }
        }
      }
    }

    // Store alerts — clear old and bulk create new
    const existing = await base44.asServiceRole.entities.PreconCopilotAlert.list('-created_date', 500);
    // Delete in parallel batches of 10
    const deletePromises = existing.map(old => base44.asServiceRole.entities.PreconCopilotAlert.delete(old.id));
    await Promise.all(deletePromises);
    
    if (alerts.length > 0) {
      await base44.asServiceRole.entities.PreconCopilotAlert.bulkCreate(alerts);
    }

    return Response.json({
      success: true,
      leads_scanned: activeLeads.length,
      alerts_generated: alerts.length,
      alert_breakdown: {
        overdue: alerts.filter(a => a.alert_type === 'overdue').length,
        missing_fields: alerts.filter(a => a.alert_type === 'missing_fields').length,
        missing_approval: alerts.filter(a => a.alert_type === 'missing_approval').length,
        budget_drift: alerts.filter(a => a.alert_type === 'budget_drift').length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Inline helpers (no local imports in backend functions) ──

function calculateDueDateSimple(dueDateLogic, projectStartDate, completionDates) {
  if (!dueDateLogic || !projectStartDate) return null;
  const start = new Date(projectStartDate);
  if (isNaN(start.getTime())) return null;
  const logic = dueDateLogic.trim().toLowerCase();

  const dayMatch = logic.match(/^day\s+(\d+)/);
  if (dayMatch) {
    const d = new Date(start);
    d.setDate(d.getDate() + parseInt(dayMatch[1]) - 1);
    return d;
  }
  const weekMatch = logic.match(/^week\s+(\d+)/);
  if (weekMatch) {
    const d = new Date(start);
    d.setDate(d.getDate() + (parseInt(weekMatch[1]) - 1) * 7);
    return d;
  }
  const relMatch = logic.match(/\+(\d+)\s*days?\s*from\s*stage\s*(\d+)/);
  if (relMatch) {
    const ref = completionDates?.[parseInt(relMatch[2])];
    if (ref) {
      const d = new Date(ref);
      d.setDate(d.getDate() + parseInt(relMatch[1]));
      return d;
    }
  }
  return null;
}

function checkRequiredFieldsSimple(stageOrder, formData) {
  // Inline required field configs for key stages
  const REQUIRED_FIELDS = {
    1: [{ key: 'project_name', label: 'Project Name' }, { key: 'go_no_go_decision', label: 'Go / No-Go Decision' }],
    2: [{ key: 'meeting_date', label: 'Meeting Date' }],
    3: [{ key: 'visit_date', label: 'Visit Date' }],
    5: [{ key: 'zoning_compliance', label: 'Zoning Compliance' }, { key: 'overall_recommendation', label: 'Overall Recommendation' }],
    6: [{ key: 'total_estimated_cost', label: 'Total Estimated Cost' }],
    7: [{ key: 'presentation_date', label: 'Presentation Date' }, { key: 'alignment_status', label: 'Alignment Status' }],
    8: [{ key: 'client_signed_date', label: 'Client Signature Date' }, { key: 'company_signed_date', label: 'Company Signature Date' }],
    11: [{ key: 'review_date', label: 'Review Meeting Date' }],
    16: [{ key: 'compliance_result', label: 'Compliance Result' }],
    17: [{ key: 'review_date', label: 'Review Meeting Date' }],
    18: [{ key: 'total_hard_costs', label: 'Total Hard Costs' }],
    19: [{ key: 've_session_date', label: 'VE Session Date' }],
    20: [{ key: 'presentation_date', label: 'Presentation Date' }, { key: 'final_budget', label: 'Final Approved Budget' }],
    23: [{ key: 'submission_date', label: 'Submission Date' }],
    25: [{ key: 'permit_number', label: 'Permit Number' }, { key: 'issue_date', label: 'Issue Date' }],
    27: [{ key: 'total_contracted_value', label: 'Total Contracted Value' }],
    28: [{ key: 'project_duration_weeks', label: 'Project Duration' }, { key: 'start_date', label: 'Start Date' }, { key: 'completion_date', label: 'Completion Date' }],
    29: [{ key: 'meeting_date', label: 'Meeting Date' }],
    30: [{ key: 'meeting_date', label: 'Meeting Date' }],
    32: [{ key: 'review_date', label: 'Review Date' }],
    33: [{ key: 'contract_value', label: 'Contract Value' }, { key: 'start_date', label: 'Start Date' }, { key: 'completion_date', label: 'Completion Date' }, { key: 'client_signed_date', label: 'Client Signature Date' }, { key: 'company_signed_date', label: 'Company Signature Date' }],
    34: [{ key: 'handoff_date', label: 'Handoff Date' }],
  };

  const fields = REQUIRED_FIELDS[stageOrder];
  if (!fields) return [];
  return fields.filter(f => {
    const val = formData?.[f.key];
    return val === undefined || val === null || val === '' || val === false;
  }).map(f => f.label);
}

function getLatestBudget(stageOrder, formData) {
  if (!formData) return null;
  if (stageOrder === 18) {
    const hard = parseFloat(formData.total_hard_costs) || 0;
    const soft = parseFloat(formData.total_soft_costs) || 0;
    const pct = parseFloat(formData.contingency_pct) || 0;
    return hard + soft + (hard * pct / 100);
  }
  if (stageOrder === 19) {
    const orig = parseFloat(formData.original_estimate) || 0;
    const sav = parseFloat(formData.savings_accepted) || 0;
    return orig > 0 ? orig - sav : null;
  }
  if (stageOrder === 20) {
    return parseFloat(formData.final_budget) || null;
  }
  return null;
}