import React from 'react';
import { canEdit, canDelete, canCreate, isAdmin } from '../utils/permissions';

/**
 * PermissionGuard Component
 * Conditionally renders children based on user permissions
 */
export default function PermissionGuard({ user, record, action, children, fallback = null }) {
  let hasPermission = false;
  
  switch (action) {
    case 'edit':
      hasPermission = canEdit(user, record);
      break;
    case 'delete':
      hasPermission = canDelete(user, record);
      break;
    case 'create':
      hasPermission = canCreate(user);
      break;
    case 'admin':
      hasPermission = isAdmin(user);
      break;
    default:
      hasPermission = true;
  }
  
  if (!hasPermission) {
    return fallback;
  }
  
  return <>{children}</>;
}