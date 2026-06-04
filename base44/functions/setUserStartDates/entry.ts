import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { updates } = await req.json();
    // updates = [{ email: "paul@...", commission_start_date: "2020-01-01" }, ...]

    if (!updates || !Array.isArray(updates)) {
      return Response.json({ error: 'Missing updates array' }, { status: 400 });
    }

    const results = [];
    const allUsers = await base44.asServiceRole.entities.User.list();

    for (const update of updates) {
      const targetUser = allUsers.find(u => u.email === update.email);
      if (!targetUser) {
        results.push({ email: update.email, status: 'not_found' });
        continue;
      }
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        commission_start_date: update.commission_start_date
      });
      results.push({ email: update.email, name: targetUser.full_name, status: 'updated' });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});