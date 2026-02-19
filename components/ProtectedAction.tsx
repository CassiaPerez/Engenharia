import React from 'react';
import { UserRole } from '../types';
import { hasPermission, ModuleId, PermissionAction } from '../services/permissions';

interface Props {
  role: UserRole;
  module: ModuleId;
  action: PermissionAction;
  userId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ProtectedAction: React.FC<Props> = ({ role, module, action, userId, children, fallback = null }) => {
  const allowed = hasPermission(role, module, action, userId);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedAction;
