/**
 * Phase 3 – Centralized guardrail logic for precon stage completion.
 * Ties DeliverableForm required-field validation into stage completion checks.
 */
import CONFIGS from './deliverableFormConfigs';
import { evaluateFormula } from './calcEngine';

/**
 * Parse validation_rules text from a PreconStage into structured rules.
 */
export function parseValidationRules(rulesText) {
  if (!rulesText) return [];
  return rulesText.split(',').map(r => r.trim()).filter(Boolean);
}

/**
 * Check legacy validation rules (deliverable notes/URL required, approval required).
 */
export function checkLegacyValidation(progress, rules) {
  const failures = [];
  for (const rule of rules) {
    const lower = rule.toLowerCase();
    if (lower.includes('deliverable') && lower.includes('required')) {
      if (!progress?.deliverable_notes?.trim() && !progress?.deliverable_url?.trim()) {
        failures.push('Deliverable notes or URL required');
      }
    }
    if (lower.includes('approval') && lower.includes('approved')) {
      if (progress?.approval_status !== 'approved') {
        failures.push('Approval must be granted');
      }
    }
  }
  return failures;
}

/**
 * Check if all required DeliverableForm fields are filled for a given stage.
 * Returns an array of missing field labels.
 */
export function checkFormRequiredFields(stageOrder, formData) {
  const config = CONFIGS[stageOrder];
  if (!config) return []; // no form config → no form guardrails
  const errors = [];
  for (const field of config.fields) {
    if (field.required && field.type !== 'calculated') {
      const val = formData?.[field.key];
      if (val === undefined || val === null || val === '' || val === false) {
        errors.push(field.label);
      }
    }
  }
  return errors;
}

/**
 * Full guardrail check: combines legacy validation + form required fields.
 * Returns { canComplete, failures[] }
 */
export function fullGuardrailCheck(stage, progress) {
  const legacyRules = parseValidationRules(stage.validation_rules);
  const legacyFailures = checkLegacyValidation(progress, legacyRules);
  const formFailures = checkFormRequiredFields(stage.stage_order, progress?.form_data);
  const allFailures = [
    ...legacyFailures,
    ...formFailures.map(f => `Form field "${f}" is required`),
  ];
  return { canComplete: allFailures.length === 0, failures: allFailures };
}

/**
 * Extract financial data from all progress records for a lead.
 * Scans known financial fields across form_data to build summary.
 */
export function extractFinancialSummary(progressRecords, stages) {
  const stageOrderMap = {};
  (stages || []).forEach(s => { stageOrderMap[s.id] = s.stage_order; });

  let estimatedPreconValue = null;
  let estimatedConstructionValue = null;

  for (const prog of progressRecords) {
    const order = stageOrderMap[prog.stage_id];
    const fd = prog.form_data || {};

    // Stage 1: intake values
    if (order === 1) {
      if (fd.estimated_precon_value) estimatedPreconValue = parseFloat(fd.estimated_precon_value) || estimatedPreconValue;
      if (fd.estimated_construction_value) estimatedConstructionValue = parseFloat(fd.estimated_construction_value) || estimatedConstructionValue;
    }
    // Stage 6: preliminary budget
    if (order === 6 && fd.total_estimated_cost) {
      estimatedConstructionValue = parseFloat(fd.total_estimated_cost) || estimatedConstructionValue;
    }
    // Stage 18: detailed cost estimate
    if (order === 18 && fd.total_hard_costs) {
      const hard = parseFloat(fd.total_hard_costs) || 0;
      const soft = parseFloat(fd.total_soft_costs) || 0;
      const pct = parseFloat(fd.contingency_pct) || 0;
      const total = hard + soft + (hard * pct / 100);
      if (total > 0) estimatedConstructionValue = total;
    }
    // Stage 19: value engineered estimate
    if (order === 19) {
      const orig = parseFloat(fd.original_estimate) || 0;
      const savings = parseFloat(fd.savings_accepted) || 0;
      if (orig > 0) estimatedConstructionValue = orig - savings;
    }
    // Stage 20: client approved budget
    if (order === 20 && fd.final_budget) {
      estimatedConstructionValue = parseFloat(fd.final_budget) || estimatedConstructionValue;
    }
    // Stage 33: construction contract value
    if (order === 33 && fd.contract_value) {
      estimatedConstructionValue = parseFloat(fd.contract_value) || estimatedConstructionValue;
    }
    // Stage 8: precon fee
    if (order === 8 && fd.precon_fee) {
      estimatedPreconValue = parseFloat(fd.precon_fee) || estimatedPreconValue;
    }
  }

  return { estimatedPreconValue, estimatedConstructionValue };
}

/**
 * Calculate due dates from due_date_logic strings.
 * Supports patterns like:
 *   "Day 1", "Day 3", "Day 7", "+2 days from Stage 1", "Week 1", "Week 2"
 */
export function calculateDueDate(dueDateLogic, projectStartDate, stageCompletionDates) {
  if (!dueDateLogic || !projectStartDate) return null;
  const start = new Date(projectStartDate);
  if (isNaN(start.getTime())) return null;
  const logic = dueDateLogic.trim().toLowerCase();

  // "day N" pattern
  const dayMatch = logic.match(/^day\s+(\d+)/);
  if (dayMatch) {
    const d = new Date(start);
    d.setDate(d.getDate() + parseInt(dayMatch[1]) - 1);
    return d;
  }

  // "week N" pattern
  const weekMatch = logic.match(/^week\s+(\d+)/);
  if (weekMatch) {
    const d = new Date(start);
    d.setDate(d.getDate() + (parseInt(weekMatch[1]) - 1) * 7);
    return d;
  }

  // "+N days from Stage M"
  const relMatch = logic.match(/\+(\d+)\s*days?\s*from\s*stage\s*(\d+)/);
  if (relMatch) {
    const daysOffset = parseInt(relMatch[1]);
    const refStage = parseInt(relMatch[2]);
    const refDate = stageCompletionDates?.[refStage];
    if (refDate) {
      const d = new Date(refDate);
      d.setDate(d.getDate() + daysOffset);
      return d;
    }
    return null;
  }

  return null;
}