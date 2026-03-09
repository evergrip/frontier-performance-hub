import { base44 } from '@/api/base44Client';

const FIELD_LABELS = {
  // Lead fields
  title: 'Title',
  client_id: 'Client',
  source: 'Lead Source',
  lead_score: 'Lead Score',
  estimated_precon_value: 'Est. Precon Value',
  estimated_construction_value: 'Est. Construction Value',
  assigned_to: 'Assigned To',
  notes: 'Notes',
  // Sale fields
  contract_value: 'Contract Value',
  estimated_construction_budget: 'Est. Construction Budget',
  estimated_margin: 'Estimated Margin',
  target_precon_completion_date: 'Target Completion Date',
  sale_type: 'Sale Type',
  minimum_draw_threshold: 'Min Draw Threshold',
  // Project fields
  actual_costs: 'Actual Costs',
  actual_margin: 'Actual Margin',
  start_date: 'Start Date',
  target_completion_date: 'Target Completion',
  project_manager_id: 'Project Manager',
  crew_assignment: 'Crew Assignment',
  project_type: 'Project Type',
};

function formatValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}

export function computeChanges(oldData, newData, trackedFields) {
  const changes = [];
  for (const field of trackedFields) {
    const oldVal = formatValue(oldData[field]);
    const newVal = formatValue(newData[field]);
    if (oldVal !== newVal) {
      changes.push({
        field,
        field_label: FIELD_LABELS[field] || field,
        old_value: oldVal,
        new_value: newVal,
      });
    }
  }
  return changes;
}

export async function logEdit({ entityType, entityId, entityTitle, changes, notes }) {
  if (!changes || changes.length === 0) return;
  const user = await base44.auth.me();
  await base44.entities.EditLog.create({
    entity_type: entityType,
    entity_id: entityId,
    entity_title: entityTitle,
    edited_by_id: user.id,
    edited_by_name: user.full_name || user.email,
    changes,
    notes: notes || '',
  });
}