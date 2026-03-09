import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role to list all users so non-admin salespeople can see each other
  const allUsers = await base44.asServiceRole.entities.User.list();

  // Return users who are in the Sales department (via department or departments array)
  const salespeople = allUsers.filter(u => {
    const inSalesDept = u.department === 'Sales' || (u.departments && u.departments.includes('Sales'));
    return inSalesDept || u.role === 'admin';
  }).map(u => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    department: u.department,
    departments: u.departments,
  }));

  return Response.json({ salespeople });
});