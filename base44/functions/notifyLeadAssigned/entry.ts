import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data, event } = payload;
    if (!data || !data.assigned_to) {
      return Response.json({ skipped: true, reason: 'No assigned salesperson' });
    }

    // Look up the assigned salesperson
    const users = await base44.asServiceRole.entities.User.list();
    const assignee = users.find(u => u.id === data.assigned_to);
    if (!assignee?.email) {
      return Response.json({ skipped: true, reason: 'Assigned user not found or has no email' });
    }

    // Look up the client name
    let clientName = 'Unknown Client';
    if (data.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
      if (clients.length > 0) {
        clientName = clients[0].contact_name || clients[0].company_name || 'Unknown Client';
      }
    }

    const estPrecon = data.estimated_precon_value ? `$${Number(data.estimated_precon_value).toLocaleString()}` : 'N/A';
    const estConstruction = data.estimated_construction_value ? `$${Number(data.estimated_construction_value).toLocaleString()}` : 'N/A';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ea7924, #d66a1f); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🎯 New Lead Assigned to You</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #334155; font-size: 16px; margin-top: 0;">Hi ${assignee.full_name},</p>
          <p style="color: #475569;">A new project lead has been assigned to you:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #334155; border: 1px solid #e2e8f0;">Lead Title</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #475569;">${data.title || 'Untitled'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #334155; border: 1px solid #e2e8f0;">Client</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #475569;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #334155; border: 1px solid #e2e8f0;">Est. Precon Value</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #475569;">${estPrecon}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #334155; border: 1px solid #e2e8f0;">Est. Construction Value</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #475569;">${estConstruction}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #334155; border: 1px solid #e2e8f0;">Source</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #475569;">${data.source || 'N/A'}</td>
            </tr>
          </table>
          ${data.notes ? `<p style="color: #475569; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #ea7924;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Log in to the app to view and manage this lead.</p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: assignee.email,
      subject: `🎯 New Lead Assigned: ${data.title || 'Untitled'} — ${clientName}`,
      body: emailBody,
    });

    return Response.json({ success: true, notified: assignee.email });
  } catch (error) {
    console.error('Error in notifyLeadAssigned:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});