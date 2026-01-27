import React from 'react';
import CommissionsAdmin from '../../pages/CommissionsAdmin';

export default function CommissionsAdminTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Commission Management</h2>
      <CommissionsAdmin />
    </div>
  );
}