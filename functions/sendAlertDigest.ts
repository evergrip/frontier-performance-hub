import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all unsent digest notifications
    const pendingNotifications = await base44.asServiceRole.entities.AlertNotification.filter({
      delivery_mode: 'daily_digest',
      sent: false,
    });

    if (pendingNotifications.length === 0) {
      return Response.json({ success: true, message: 'No pending digest notifications', sent: 0 });
    }

    // Group by user
    const byUser = {};
    for (const n of pendingNotifications) {
      if (!byUser[n.user_email]) {
        byUser[n.user_email] = { email: n.user_email, notifications: [] };
      }
      byUser[n.user_email].notifications.push(n);
    }

    let sentCount = 0;

    for (const userEmail of Object.keys(byUser)) {
      const { notifications } = byUser[userEmail];

      const rows = notifications.map(n =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${n.entity_type}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${n.entity_title || ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${n.event_summary}</td>
        </tr>`
      ).join('');

      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <h2 style="color: #1e293b;">📋 Your Daily Alert Summary</h2>
          <p style="color: #64748b;">You have ${notifications.length} notification${notifications.length > 1 ? 's' : ''} from today.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Type</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Item</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Event</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top: 16px; color: #94a3b8; font-size: 12px;">Manage your alerts in the Notifications settings.</p>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: userEmail,
        subject: `📋 Daily Alert Summary — ${notifications.length} update${notifications.length > 1 ? 's' : ''}`,
        body,
        from_name: 'Frontier Alerts',
      });

      // Mark all as sent
      for (const n of notifications) {
        await base44.asServiceRole.entities.AlertNotification.update(n.id, {
          sent: true,
          sent_at: new Date().toISOString(),
        });
      }

      sentCount += notifications.length;
    }

    return Response.json({ success: true, users: Object.keys(byUser).length, sent: sentCount });
  } catch (error) {
    console.error('Digest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});