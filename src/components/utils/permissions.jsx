/**
 * Permissions Utility
 * Centralized permission checks for the application
 */

// Check if user can edit a record
export const canEdit = (user, record) => {
  // Admins can edit everything
  if (user?.role === 'admin') return true;
  
  // Regular users can only edit records assigned to them
  if (record.assigned_to === user?.id) return true;
  
  // For entities without assigned_to, check created_by
  if (record.created_by === user?.email) return true;
  
  return false;
};

// Check if user can delete a record
export const canDelete = (user, record) => {
  // Only admins can delete
  return user?.role === 'admin';
};

// Check if user can create records
export const canCreate = (user) => {
  // All authenticated users can create
  return !!user;
};

// Check if user can view a record (company-wide view)
export const canView = (user, record) => {
  // All authenticated users can view records (company-wide visibility)
  return !!user;
};

// Check if user is admin
export const isAdmin = (user) => {
  return user?.role === 'admin';
};

// Get filtered records based on user permissions
export const filterByPermission = (user, records, action = 'view') => {
  if (!user) return [];
  
  // Admins see everything
  if (user.role === 'admin') return records;
  
  // For view action, all users see all records (company-wide)
  if (action === 'view') return records;
  
  // For edit/delete, filter to only records they can modify
  if (action === 'edit' || action === 'delete') {
    return records.filter(record => canEdit(user, record) || canDelete(user, record));
  }
  
  return records;
};