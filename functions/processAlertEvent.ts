import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const LEAD_STATUS_LABELS = {
  new_project_lead: 'New Project Lead',
  initial_video_consult: 'Initial Video Consult',
  initial_inperson_consultation: 'Initial In-Person Consultation',
  preconstruction_proposal: 'Preconstruction Proposal',
  followup: 'Follow-up',
  converted: 'Converted',
  disqualified: 'Disqualified',
};

const SALE_STATUS_LABELS = {
  feasibility: 'Feasibility',
  design_material_selections: 'Design & Materials',
  engineering_permits: 'Engineering & Permits',
  pending_construction_sale: 'Pending Construction Sale',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

const PROJECT_STATUS_LABELS = {
  awaiting_to_be_scheduled: 'Awaiting Scheduling',
  mobilization: 'Mobilization',
  active_construction: 'Active Construction',
  substantial_completion_closeout: 'Closeout',
  closed: 'Closed',
};

function getStatusLabel(entityType, status) {
  if (entityType === 'lead') return LEAD_STATUS_LABELS[status] || status;
  if (entityType === 'sale') return SALE_STATUS_LABELS[status] || status;
  if (entityType === 'project') return PROJECT_STATUS_LABELS[status] || status;
  return status;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity_type, entity_id, event_type_hint, data, old_data } = await req.json();

    if (!entity_type || !data) {
      return Response.json({ error: 'Missing entity_type or data' }, { status: 400 });
    }

    // Determine what events happened
    const events = [];
    const entityTitle = data.title || 'Untitled';
    const assignedTo = data.assigned_to || data.project_manager_id;

    if (event_type_hint === 'create') {
      events.push({
        event_type: `${entity_type}_created`,
        summary: `New ${entity_type} created: "${entityTitle}"`,
        status_from: null,
        status_to: data.status || null,
      });
    }

    if (event_type_hint === 'update' && old_data && data.status !== old_data.status) {
      const fromLabel = getStatusLabel(entity_type, old_data.status);
      const toLabel = getStatusLabel(entity_type, data.status);

      events.push({
        event_type: `${entity_type}_status_change`,
        summary: `${entity_type === 'lead' ? 'Lead' : entity_type === 'sale' ? 'Pre-Construction' : 'Project'} "${entityTitle}" moved from ${fromLabel} → ${toLabel}`,
        status_from: old_data.status,
        status_to: data.status,
      });

      // Special: lead converted
      if (entity_type === 'lead' && data.status === 'converted') {
        events.push({
          event_type: 'lead_converted',
          summary: `Lead "${entityTitle}" has been converted to pre-construction`,
          status_from: old_data.status,
          status_to: 'converted',
        });
      }
    }

    if (events.length === 0) {
      return Response.json({ success: true, message: 'No matching events', notifications: 0 });
    }

    // Fetch all active alert rules for this entity type
    const alertRules = await base44.asServiceRole.entities.AlertRule.filter({
      entity_type: entity_type,
      is_active: true,
    });

    let notificationCount = 0;

    for (const event of events) {
      // Find matching rules
      const matchingRules = alertRules.filter(rule => {
        // Match event type
        if (rule.event_type !== event.event_type) return false;

        // Filter by status_from if set
        if (rule.filter_status_from && event.status_from && rule.filter_status_from !== event.status_from) return false;

        // Filter by status_to if set
        if (rule.filter_status_to && event.status_to && rule.filter_status_to !== event.status_to) return false;

        // Filter by assigned_to_me
        if (rule.filter_assigned_to_me && assignedTo !== rule.user_id) return false;

        return true;
      });

      for (const rule of matchingRules) {
        // Create notification record
        const notification = await base44.asServiceRole.entities.AlertNotification.create({
          alert_rule_id: rule.id,
          user_id: rule.user_id,
          user_email: rule.user_email,
          entity_type: entity_type,
          entity_id: entity_id,
          entity_title: entityTitle,
          event_type: event.event_type,
          event_summary: event.summary,
          status_from: event.status_from || '',
          status_to: event.status_to || '',
          delivery_mode: rule.delivery_mode,
          sent: false,
        });

        // If immediate, send email now
        if (rule.delivery_mode === 'immediate') {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: rule.user_email,
            subject: `🔔 Alert: ${event.summary}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8fafc; border-left: 4px solid #ea7924; padding: 16px; border-radius: 4px;">
                  <h2 style="margin: 0 0 8px 0; color: #1e293b;">${event.summary}</h2>
                  ${event.status_from ? `<p style="margin: 4px 0; color: #64748b;">From: <strong>${getStatusLabel(entity_type, event.status_from)}</strong></p>` : ''}
                  ${event.status_to ? `<p style="margin: 4px 0; color: #64748b;">To: <strong>${getStatusLabel(entity_type, event.status_to)}</strong></p>` : ''}
                  <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">This alert was triggered by your notification rule.</p>
                </div>
              </div>
            `,
            from_name: 'Frontier Alerts',
          });

          await base44.asServiceRole.entities.AlertNotification.update(notification.id, {
            sent: true,
            sent_at: new Date().toISOString(),
          });
        }

        notificationCount++;
      }
    }

    return Response.json({ success: true, events: events.length, notifications: notificationCount });
  } catch (error) {
    console.error('Alert processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});