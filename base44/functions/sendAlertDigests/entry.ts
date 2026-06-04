import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const pendingItems = await base44.asServiceRole.entities.AlertDigest.filter({ sent: false });
    if (!pendingItems || pendingItems.length === 0) {
      return Response.json({ success: true, message: 'No pending digest items' });
    }

    // Group by user_id (not email, so we can look up their rule preferences)
    const grouped = {};
    for (const item of pendingItems) {
      const key = item.user_id;
      if (!grouped[key]) grouped[key] = { email: item.user_email, items: [] };
      grouped[key].items.push(item);
    }

    // Load alert rules to get custom email settings
    const allRules = await base44.asServiceRole.entities.AlertRule.filter({ delivery_method: 'daily_digest', is_active: true });
    const rulesByUser = {};
    for (const rule of allRules) {
      if (!rulesByUser[rule.user_id]) rulesByUser[rule.user_id] = [];
      rulesByUser[rule.user_id].push(rule);
    }

    const results = [];

    for (const [userId, { email, items }] of Object.entries(grouped)) {
      const userRules = rulesByUser[userId] || [];
      
      // Find custom subject/intro from any of the user's digest rules
      const customRule = userRules.find(r => r.email_subject_template || r.email_intro_text);
      const subject = customRule?.email_subject_template
        ? customRule.email_subject_template.replace('{count}', String(items.length)).replace('{event}', `${items.length} updates`)
        : `Daily Alert Digest — ${items.length} update${items.length > 1 ? 's' : ''}`;
      const intro = customRule?.email_intro_text || `You have ${items.length} update${items.length > 1 ? 's' : ''} from your alert rules:`;

      const rows = items.map(item =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">${item.entity_type}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 13px;">${item.event_summary}</td>
        </tr>`
      ).join('');

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ea7924; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">📋 Daily Alert Digest</h2>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p style="color: #64748b; margin-top: 0;">${intro}</p>
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