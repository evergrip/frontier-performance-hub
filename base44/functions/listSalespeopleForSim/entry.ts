import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const users = await base44.asServiceRole.entities.User.list();

  const mapped = users.map(u => ({
    id: u.id,
    full_name: u.full_name || u.email || 'Unknown',
    hire_date: u.hire_date || '',
    profit_sharing_pools: u.profit_sharing_pools || [],
    profit_sharing_eligible: u.profit_sharing_eligible ?? false,
  }));

  return Response.json({ users: mapped });
});