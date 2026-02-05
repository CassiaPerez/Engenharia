import { UserRole } from '../types';
import { hasPermission, ModuleId, PermissionAction, getModulePermissions } from '../services/permissions';

export function usePermissions(role: UserRole, module: ModuleId) {
  const permissions = getModulePermissions(role, module);

  return {
    canView: permissions.view,
    canCreate: permissions.create,
    canEdit: permissions.edit,
    canDelete: permissions.delete,
    canExport: permissions.export,
    hasPermission: (action: PermissionAction) => hasPermission(role, module, action),
    permissions
  };
}

export function useModulePermissions(role: UserRole) {
  return {
    hasPermission: (module: ModuleId, action: PermissionAction) =>
      hasPermission(role, module, action),
    getPermissions: (module: ModuleId) => getModulePermissions(role, module)
  };
}
