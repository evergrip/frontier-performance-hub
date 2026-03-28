import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DEFAULT_FIELDS = ['title', 'client', 'client_email', 'client_phone', 'source', 'estimated_precon_value', 'estimated_construction_value', 'notes'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data, old_data, event } = payload;
    if (!data || !data.assigned_to) {
      return Response.json({ skipped: true, reason: 'No assigned salesperson' });
    }

    // For update events, only notify if assigned_to actually changed
    const isReassignment = event?.type === 'update' && old_data?.assigned_to !== data.assigned_to;
    const isCreate = event?.type === 'create';
    if (!isCreate && !isReassignment) {
      return Response.json({ skipped: true, reason: 'assigned_to did not change' });
    }

    const triggerType = isReassignment ? 'reassigned' : 'new_lead';

    // Load alert field config
    const settings = await base44.asServiceRole.entities.CompanySettings.filter({});
    const enabledFields = (settings.length > 0 && settings[0].lead_alert_fields?.length > 0)
      ? settings[0].lead_alert_fields
      : DEFAULT_FIELDS;

    // Look up the assigned salesperson
    const users = await base44.asServiceRole.entities.User.list();
    const assignee = users.find(u => u.id === data.assigned_to);
    if (!assignee?.email) {
      return Response.json({ skipped: true, reason: 'Assigned user not found or has no email' });
    }

    // Look up the client details
    let clientName = 'Unknown Client';
    let clientEmail = '';
    let clientPhone = '';
    let clientAddress = '';
    if (data.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
      if (clients.length > 0) {
        const client = clients[0];
        clientName = client.contact_name || client.company_name || 'Unknown Client';
        clientEmail = client.email || '';
        clientPhone = client.phone || '';
        clientAddress = client.address || '';
      }
    }

    // Build table rows based on enabled fields
    const fieldDefs = [
      { key: 'title', label: 'Lead Title', value: data.title || 'Untitled' },
      { key: 'client', label: 'Client', value: clientName },
      { key: 'client_email', label: 'Client Email', value: clientEmail || 'N/A' },
      { key: 'client_phone', label: 'Client Phone', value: clientPhone || 'N/A' },
      { key: 'client_address', label: 'Client Address', value: clientAddress || 'N/A' },
      { key: 'source', label: 'Source', value: data.source || 'N/A' },
      { key: 'estimated_precon_value', label: 'Est. Precon Value', value: data.estimated_precon_value ? `$${Number(data.estimated_precon_value).toLocaleString()}` : 'N/A' },
      { key: 'estimated_construction_value', label: 'Est. Construction Value', value: data.estimated_construction_value ? `$${Number(data.estimated_construction_value).toLocaleString()}` : 'N/A' },
      { key: 'notes', label: 'Notes', value: data.notes || '' },
    ];

    const visibleFields = fieldDefs.filter(f => enabledFields.includes(f.key));

    // Build table rows (skip notes from table, show separately)
    const tableRows = visibleFields
      .filter(f => f.key !== 'notes')
      .map(f => `
        <tr>
          <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #334155; border: 1px solid #e2e8f0;">${f.label}</td>
          <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #475569;">${f.value}</td>
        </tr>
      `).join('');

    const notesField = visibleFields.find(f => f.key === 'notes');
    const notesHtml = (notesField && notesField.value)
      ? `<p style="color: #475569; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #ea7924;"><strong>Notes:</strong> ${notesField.value}</p>`
      : '';

    const subjectTitle = data.title || 'Untitled';
    const subjectClient = enabledFields.includes('client') ? ` — ${clientName}` : '';
    const subjectPrefix = isReassignment ? '🔄 Lead Reassigned' : '🎯 New Lead Assigned';
    const headerText = isReassignment ? '🔄 Lead Reassigned to You' : '🎯 New Lead Assigned to You';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ea7924, #d66a1f); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">${headerText}</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 16px; margin-top: 0;">Hi ${assignee.full_name},</p>
          <p style="color: #475569;">A project lead has been ${isReassignment ? 'reassigned' : 'assigned'} to you:</p>
          ${tableRows ? `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${tableRows}</table>` : ''}
          ${notesHtml}
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Log in to the app to view and manage this lead.</p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: assignee.email,
      subject: `${subjectPrefix}: ${subjectTitle}${subjectClient}`,
      body: emailBody,
    });

    // Log the alert
    await base44.asServiceRole.entities.LeadAlertLog.create({
      lead_id: data.id || event?.entity_id || '',
      lead_title: data.title || 'Untitled',
      sent_to_email: assignee.email,
      sent_to_name: assignee.full_name || '',
      sent_to_user_id: assignee.id || '',
      trigger_type: triggerType,
      fields_included: enabledFields,
    });

    return Response.json({ success: true, notified: assignee.email, trigger: triggerType, fields: enabledFields });
  } catch (error) {
    console.error('Error in notifyLeadAssigned:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});