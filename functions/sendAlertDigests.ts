import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all unsent digest items
    const pendingItems = await base44.asServiceRole.entities.AlertDigest.filter({ sent: false });
    
    if (!pendingItems || pendingItems.length === 0) {
      return Response.json({ success: true, message: 'No pending digest items' });
    }

    // Group by user_email
    const grouped = {};
    for (const item of pendingItems) {
      if (!grouped[item.user_email]) {
        grouped[item.user_email] = [];
      }
      grouped[item.user_email].push(item);
    }

    const results = [];

    for (const [email, items] of Object.entries(grouped)) {
      const rows = items.map(item => 
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">${item.entity_type}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 13px;">${item.event_summary}</td>
        </tr>`
      ).join('');

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Daily Alert Digest — ${items.length} update${items.length > 1 ? 's' : ''}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ea7924; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">📋 Daily Alert Digest</h2>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p style="color: #64748b; margin-top: 0;">You have ${items.length} update${items.length > 1 ? 's' : ''} from your alert rules:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 2px solid #e2e8f0;">Type</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 2px solid #e2e8f0;">Event</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">You can manage your alerts in the app.</p>
            </div>
          </div>
        `,
      });

      // Mark all as sent
      for (const item of items) {
        await base44.asServiceRole.entities.AlertDigest.update(item.id, { sent: true });
      }

      results.push({ email, count: items.length });
    }

    return Response.json({ success: true, digests_sent: results });
  } catch (error) {
    console.error('sendAlertDigests error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});