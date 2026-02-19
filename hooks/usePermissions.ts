import { UserRole } from '../types';
import { hasPermission, ModuleId, PermissionAction, getModulePermissions, canEditField as checkFieldEdit, getUserFieldPermissions } from '../services/permissions';

export function usePermissions(role: UserRole, module: ModuleId, userId?: string) {
  const permissions = getModulePermissions(role, module, userId);

  return {
    canView: permissions.view,
    canCreate: permissions.create,
    canEdit: permissions.edit,
    canDelete: permissions.delete,
    canExport: permissions.export,
    hasPermission: (action: PermissionAction) => hasPermission(role, module, action, userId),
    canEditField: (fieldName: string) => userId ? checkFieldEdit(userId, module, fieldName, role) : permissions.edit,
    getFieldPermissions: () => userId ? getUserFieldPermissions(userId, module) : undefined,
    permissions
  };
}

export function useModulePermissions(role: UserRole, userId?: string) {
  return {
    hasPermission: (module: ModuleId, action: PermissionAction) =>
      hasPermission(role, module, action, userId),
    getPermissions: (module: ModuleId) => getModulePermissions(role, module, userId)
  };
}
