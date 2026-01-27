import React from 'react';
import UsersAdmin from '../../pages/UsersAdmin';

export default function UsersAdminTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">User Management</h2>
      <UsersAdmin />
    </div>
  );
}