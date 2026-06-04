import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await base44.asServiceRole.entities.User.list();

  const mapped = users.map(u => ({
    id: u.id,
    full_name: u.full_name || u.email || 'Unknown',
    email: u.email,
    role: u.role,
    department: u.department,
    departments: u.departments,
  }));

  return Response.json({ users: mapped });
});