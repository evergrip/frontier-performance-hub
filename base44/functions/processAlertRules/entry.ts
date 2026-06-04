import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LEAD_STATUSES = {
  new_project_lead: 'New Project Lead', initial_video_consult: 'Initial Video Consult',
  initial_inperson_consultation: 'Initial In-Person Consultation', preconstruction_proposal: 'Preconstruction Proposal',
  followup: 'Follow-Up', converted: 'Converted', disqualified: 'Disqualified',
};
const SALE_STATUSES = {
  feasibility: 'Feasibility', design_material_selections: 'Design & Material Selections',
  engineering_permits: 'Engineering & Permits', pending_construction_sale: 'Pending Construction Sale',
  closed_won: 'Closed Won', closed_lost: 'Closed Lost',
};
const PROJECT_STATUSES = {
  awaiting_to_be_scheduled: 'Awaiting Scheduling', mobilization: 'Mobilization',
  active_construction: 'Active Construction', substantial_completion_closeout: 'Substantial Completion / Closeout',
  closed: 'Closed',
};

function getStatusLabel(entityType, status) {
  if (entityType === 'Lead') return LEAD_STATUSES[status] || status;
  if (entityType === 'Sale') return SALE_STATUSES[status] || status;
  if (entityType === 'Project') return PROJECT_STATUSES[status] || status;
  return status;
}

function getAssignedUserId(entityType, data) {
  if (entityType === 'Lead') return data.assigned_to;
  if (entityType === 'Sale') return data.assigned_to;
  if (entityType === 'Project') return data.project_manager_id;
  return null;
}

function checkTriggerMatch(trigger, alertEntityType, eventType, data, old_data) {
  if (trigger.entity_type !== alertEntityType) return null;

  if (trigger.event_type === 'record_created' && eventType === 'create') {
    const title = data.title || data.name || 'Untitled';
    return `New ${alertEntityType} created: "${title}"`;
  }
  if (trigger.event_type === 'any_status_change' && eventType === 'update' && old_data) {
    if (data.status !== old_data.status) {
      const title = data.title || data.name || 'Untitled';
      const fromLabel = getStatusLabel(alertEntityType, old_data.status);
      const toLabel = getStatusLabel(alertEntityType, data.status);
      return `${alertEntityType} "${title}" moved from ${fromLabel} → ${toLabel}`;
    }
  }
  if (trigger.event_type === 'status_change' && eventType === 'update' && old_data) {
    if (data.status !== old_data.status) {
      const fromMatch = !trigger.from_status || trigger.from_status === old_data.status;
      const toMatch = !trigger.to_status || trigger.to_status === data.status;
      if (fromMatch && toMatch) {
        const title = data.title || data.name || 'Untitled';
        const fromLabel = getStatusLabel(alertEntityType, old_data.status);
        const toLabel = getStatusLabel(alertEntityType, data.status);
        return `${alertEntityType} "${title}" moved from ${fromLabel} → ${toLabel}`;
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    if (!event || !data) {
      return Response.json({ skipped: true, reason: 'no event or data' });
    }

    const entityType = event.entity_name;
    const eventType = event.type;
    const entityTypeMap = { Lead: 'Lead', Sale: 'Sale', Project: 'Project' };
    const alertEntityType = entityTypeMap[entityType];
    if (!alertEntityType) {
      return Response.json({ skipped: true, reason: 'entity not tracked' });
    }

    // Get ALL active rules (can't filter by entity_type anymore since triggers is an array)
    const allRules = await base44.asServiceRole.entities.AlertRule.filter({ is_active: true });
    if (!allRules || allRules.length === 0) {
      return Response.json({ skipped: true, reason: 'no active rules' });
    }

    const title = data.title || data.name || `${entityType} #${event.entity_id}`;
    const results = [];

    for (const rule of allRules) {
      // Check only_my_records
      if (rule.only_my_records) {
        const assignedTo = getAssignedUserId(alertEntityType, data);
        if (assignedTo !== rule.user_id) continue;
      }

      // Support both legacy single-trigger and new multi-trigger format
      const triggers = rule.triggers && rule.triggers.length > 0
        ? rule.triggers
        : [{ entity_type: rule.entity_type, event_type: rule.event_type, from_status: rule.from_status, to_status: rule.to_status }].filter(t => t.entity_type);

      // Check if ANY trigger matches
      let eventSummary = null;
      for (const trigger of triggers) {
        eventSummary = checkTriggerMatch(trigger, alertEntityType, eventType, data, old_data);
        if (eventSummary) break;
      }

      if (!eventSummary) continue;

      // Build email subject
      const defaultSubject = rule.delivery_method === 'daily_digest'
        ? `Daily Alert Digest`
        : `Alert: ${eventSummary}`;
      const emailSubject = rule.email_subject_template
        ? rule.email_subject_template.replace('{event}', eventSummary).replace('{count}', '1')
        : defaultSubject;

      const introText = rule.email_intro_text || eventSummary;

      if (rule.delivery_method === 'immediate') {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: rule.user_email,
          subject: emailSubject,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #ea7924; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🔔 Alert Notification</h2>
              </div>
              <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #1e293b; margin-top: 0;">${introText}</p>
                <p style="color: #64748b; font-size: 14px;">Alert Rule: ${rule.name || 'Unnamed'}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">You are receiving this because of an alert rule you set up. You can manage your alerts in the app.</p>
              </div>
            </div>
          `,
        });
        results.push({ rule_id: rule.id, action: 'email_sent', to: rule.user_email });
      } else {
        await base44.asServiceRole.entities.AlertDigest.create({
          user_id: rule.user_id,
          user_email: rule.user_email,
          alert_rule_id: rule.id,
          entity_type: alertEntityType,
          entity_id: event.entity_id,
          entity_title: title,
          event_summary: eventSummary,
          sent: false,
        });
        results.push({ rule_id: rule.id, action: 'queued_digest', to: rule.user_email });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('processAlertRules error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});