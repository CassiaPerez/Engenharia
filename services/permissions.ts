import { UserRole } from '../types';
import { supabase } from './supabase';

let customPermissionsCache: Record<string, ModulePermissions> = {};
let userPermissionsCache: Record<string, Record<string, ModulePermissions>> = {};
let userFieldPermissionsCache: Record<string, Record<string, Record<string, { edit: boolean }>>> = {};
let userWarehousesCache: Record<string, string[]> = {};

export type ModuleId =
  | 'dashboard'
  | 'calendar'
  | 'projects'
  | 'os'
  | 'buildings'
  | 'equipments'
  | 'inventory'
  | 'services'
  | 'suppliers'
  | 'reports'
  | 'users'
  | 'documentation';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  calendar: 'Agenda de Serviços',
  projects: 'Projetos (Capex)',
  os: 'Ordens de Serviço',
  buildings: 'Edifícios',
  equipments: 'Equipamentos',
  inventory: 'Almoxarifado',
  services: 'Catálogo de Serviços',
  suppliers: 'Fornecedores',
  reports: 'Relatórios',
  users: 'Gestão de Usuários',
  documentation: 'Documentação'
};

export const PERMISSIONS_MATRIX: Record<UserRole, Record<ModuleId, ModulePermissions>> = {
  ADMIN: {
    dashboard: { view: true, create: false, edit: false, delete: false, export: true },
    calendar: { view: true, create: true, edit: true, delete: true, export: true },
    projects: { view: true, create: true, edit: true, delete: true, export: true },
    os: { view: true, create: true, edit: true, delete: true, export: true },
    buildings: { view: true, create: true, edit: true, delete: true, export: true },
    equipments: { view: true, create: true, edit: true, delete: true, export: true },
    inventory: { view: true, create: true, edit: true, delete: true, export: true },
    services: { view: true, create: true, edit: true, delete: true, export: true },
    suppliers: { view: true, create: true, edit: true, delete: true, export: true },
    reports: { view: true, create: false, edit: false, delete: false, export: true },
    users: { view: true, create: true, edit: true, delete: true, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  },
  MANAGER: {
    dashboard: { view: true, create: false, edit: false, delete: false, export: true },
    calendar: { view: true, create: true, edit: true, delete: false, export: true },
    projects: { view: true, create: true, edit: true, delete: false, export: true },
    os: { view: true, create: true, edit: true, delete: false, export: true },
    buildings: { view: true, create: true, edit: true, delete: false, export: true },
    equipments: { view: true, create: true, edit: true, delete: false, export: true },
    inventory: { view: true, create: true, edit: true, delete: false, export: true },
    services: { view: true, create: true, edit: true, delete: false, export: true },
    suppliers: { view: true, create: true, edit: true, delete: false, export: true },
    reports: { view: true, create: false, edit: false, delete: false, export: true },
    users: { view: false, create: false, edit: false, delete: false, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  },
  COORDINATOR: {
    dashboard: { view: true, create: false, edit: false, delete: false, export: false },
    calendar: { view: true, create: true, edit: true, delete: false, export: true },
    projects: { view: true, create: false, edit: false, delete: false, export: false },
    os: { view: true, create: true, edit: true, delete: false, export: true },
    buildings: { view: true, create: true, edit: true, delete: false, export: false },
    equipments: { view: true, create: true, edit: true, delete: false, export: true },
    inventory: { view: false, create: false, edit: false, delete: false, export: false },
    services: { view: true, create: false, edit: false, delete: false, export: false },
    suppliers: { view: false, create: false, edit: false, delete: false, export: false },
    reports: { view: true, create: false, edit: false, delete: false, export: true },
    users: { view: false, create: false, edit: false, delete: false, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  },
  EXECUTOR: {
    dashboard: { view: true, create: false, edit: false, delete: false, export: false },
    calendar: { view: true, create: false, edit: false, delete: false, export: false },
    projects: { view: true, create: false, edit: false, delete: false, export: false },
    os: { view: true, create: false, edit: true, delete: false, export: false },
    buildings: { view: false, create: false, edit: false, delete: false, export: false },
    equipments: { view: false, create: false, edit: false, delete: false, export: false },
    inventory: { view: false, create: false, edit: false, delete: false, export: false },
    services: { view: false, create: false, edit: false, delete: false, export: false },
    suppliers: { view: false, create: false, edit: false, delete: false, export: false },
    reports: { view: false, create: false, edit: false, delete: false, export: false },
    users: { view: false, create: false, edit: false, delete: false, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  },
  USER: {
    dashboard: { view: false, create: false, edit: false, delete: false, export: false },
    calendar: { view: true, create: false, edit: false, delete: false, export: false },
    projects: { view: false, create: false, edit: false, delete: false, export: false },
    os: { view: true, create: true, edit: false, delete: false, export: false },
    buildings: { view: false, create: false, edit: false, delete: false, export: false },
    equipments: { view: false, create: false, edit: false, delete: false, export: false },
    inventory: { view: false, create: false, edit: false, delete: false, export: false },
    services: { view: false, create: false, edit: false, delete: false, export: false },
    suppliers: { view: false, create: false, edit: false, delete: false, export: false },
    reports: { view: false, create: false, edit: false, delete: false, export: false },
    users: { view: false, create: false, edit: false, delete: false, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  },
  WAREHOUSE: {
    dashboard: { view: true, create: false, edit: false, delete: false, export: true },
    calendar: { view: false, create: false, edit: false, delete: false, export: false },
    projects: { view: true, create: false, edit: false, delete: false, export: true },
    os: { view: true, create: false, edit: true, delete: false, export: true },
    buildings: { view: false, create: false, edit: false, delete: false, export: false },
    equipments: { view: false, create: false, edit: false, delete: false, export: false },
    inventory: { view: true, create: true, edit: true, delete: true, export: true },
    services: { view: false, create: false, edit: false, delete: false, export: false },
    suppliers: { view: true, create: true, edit: true, delete: false, export: true },
    reports: { view: true, create: false, edit: false, delete: false, export: true },
    users: { view: false, create: false, edit: false, delete: false, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  },
  WAREHOUSE_BIO: {
    dashboard: { view: true, create: false, edit: false, delete: false, export: true },
    calendar: { view: false, create: false, edit: false, delete: false, export: false },
    projects: { view: true, create: false, edit: false, delete: false, export: false },
    os: { view: true, create: false, edit: true, delete: false, export: true },
    buildings: { view: false, create: false, edit: false, delete: false, export: false },
    equipments: { view: false, create: false, edit: false, delete: false, export: false },
    inventory: { view: true, create: true, edit: true, delete: false, export: true },
    services: { view: false, create: false, edit: false, delete: false, export: false },
    suppliers: { view: true, create: false, edit: false, delete: false, export: false },
    reports: { view: true, create: false, edit: false, delete: false, export: true },
    users: { view: false, create: false, edit: false, delete: false, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  },
  WAREHOUSE_FERT: {
    dashboard: { view: true, create: false, edit: false, delete: false, export: true },
    calendar: { view: false, create: false, edit: false, delete: false, export: false },
    projects: { view: true, create: false, edit: false, delete: false, export: false },
    os: { view: true, create: false, edit: true, delete: false, export: true },
    buildings: { view: false, create: false, edit: false, delete: false, export: false },
    equipments: { view: false, create: false, edit: false, delete: false, export: false },
    inventory: { view: true, create: true, edit: true, delete: false, export: true },
    services: { view: false, create: false, edit: false, delete: false, export: false },
    suppliers: { view: true, create: false, edit: false, delete: false, export: false },
    reports: { view: true, create: false, edit: false, delete: false, export: true },
    users: { view: false, create: false, edit: false, delete: false, export: false },
    documentation: { view: true, create: false, edit: false, delete: false, export: false }
  }
};

export async function loadCustomPermissions(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*');

    if (error) throw error;

    customPermissionsCache = {};
    (data || []).forEach(item => {
      const key = `${item.role}-${item.module}`;
      customPermissionsCache[key] = item.permissions as ModulePermissions;
    });
  } catch (e) {
    console.error('Erro ao carregar permissões customizadas:', e);
  }
}

export async function loadUserPermissions(userId?: string): Promise<void> {
  try {
    let query = supabase.from('user_permissions').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (userId) {
      userPermissionsCache[userId] = {};
      userFieldPermissionsCache[userId] = {};
      (data || []).forEach(item => {
        userPermissionsCache[userId][item.module] = item.permissions as ModulePermissions;
        if (item.field_permissions) {
          userFieldPermissionsCache[userId][item.module] = item.field_permissions;
        }
        if (item.warehouses) {
          userWarehousesCache[userId] = item.warehouses;
        }
      });
    } else {
      userPermissionsCache = {};
      userFieldPermissionsCache = {};
      userWarehousesCache = {};
      (data || []).forEach(item => {
        if (!userPermissionsCache[item.user_id]) {
          userPermissionsCache[item.user_id] = {};
          userFieldPermissionsCache[item.user_id] = {};
        }
        userPermissionsCache[item.user_id][item.module] = item.permissions as ModulePermissions;
        if (item.field_permissions) {
          userFieldPermissionsCache[item.user_id][item.module] = item.field_permissions;
        }
        if (item.warehouses) {
          userWarehousesCache[item.user_id] = item.warehouses;
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar permissões de usuário:', e);
  }
}

export async function saveUserPermissions(
  userId: string,
  module: ModuleId,
  permissions: ModulePermissions,
  fieldPermissions?: Record<string, { edit: boolean }>
): Promise<boolean> {
  try {
    const payload: any = {
      user_id: userId,
      module,
      permissions
    };

    if (fieldPermissions) {
      payload.field_permissions = fieldPermissions;
    }

    const { error } = await supabase
      .from('user_permissions')
      .upsert(payload, {
        onConflict: 'user_id,module'
      });

    if (error) throw error;

    if (!userPermissionsCache[userId]) {
      userPermissionsCache[userId] = {};
      userFieldPermissionsCache[userId] = {};
    }
    userPermissionsCache[userId][module] = permissions;
    if (fieldPermissions) {
      userFieldPermissionsCache[userId][module] = fieldPermissions;
    }

    return true;
  } catch (e) {
    console.error('Erro ao salvar permissões de usuário:', e);
    return false;
  }
}

export async function deleteUserPermissions(
  userId: string,
  module: ModuleId
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('module', module);

    if (error) throw error;

    if (userPermissionsCache[userId]) {
      delete userPermissionsCache[userId][module];
    }
    if (userFieldPermissionsCache[userId]) {
      delete userFieldPermissionsCache[userId][module];
    }

    return true;
  } catch (e) {
    console.error('Erro ao deletar permissões de usuário:', e);
    return false;
  }
}

export async function resetUserPermissions(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    if (userPermissionsCache[userId]) {
      delete userPermissionsCache[userId];
    }
    if (userFieldPermissionsCache[userId]) {
      delete userFieldPermissionsCache[userId];
    }

    return true;
  } catch (e) {
    console.error('Erro ao resetar permissões de usuário:', e);
    return false;
  }
}

function getEffectivePermissions(role: UserRole, module: ModuleId, userId?: string): ModulePermissions {
  if (userId && userPermissionsCache[userId]?.[module]) {
    return userPermissionsCache[userId][module];
  }

  const key = `${role}-${module}`;
  const custom = customPermissionsCache[key];

  if (custom) {
    return custom;
  }

  return PERMISSIONS_MATRIX[role]?.[module] || {
    view: false,
    create: false,
    edit: false,
    delete: false,
    export: false
  };
}

export function hasPermission(
  role: UserRole,
  module: ModuleId,
  action: PermissionAction,
  userId?: string
): boolean {
  const modulePerms = getEffectivePermissions(role, module, userId);
  if (!modulePerms) return false;
  return modulePerms[action];
}

export function canAccessModule(role: UserRole, module: ModuleId, userId?: string): boolean {
  return hasPermission(role, module, 'view', userId);
}

export function getModulePermissions(role: UserRole, module: ModuleId, userId?: string): ModulePermissions {
  return getEffectivePermissions(role, module, userId);
}

export function getUserCustomPermissions(userId: string): Record<ModuleId, ModulePermissions> {
  return (userPermissionsCache[userId] || {}) as Record<ModuleId, ModulePermissions>;
}

export function hasUserCustomPermissions(userId: string): boolean {
  return !!userPermissionsCache[userId] && Object.keys(userPermissionsCache[userId]).length > 0;
}

export function canEditField(
  userId: string,
  module: ModuleId,
  fieldName: string,
  role: UserRole
): boolean {
  if (userFieldPermissionsCache[userId]?.[module]?.[fieldName]) {
    return userFieldPermissionsCache[userId][module][fieldName].edit;
  }

  const modulePerms = getEffectivePermissions(role, module, userId);
  return modulePerms.edit;
}

export function getUserFieldPermissions(
  userId: string,
  module: ModuleId
): Record<string, { edit: boolean }> | undefined {
  return userFieldPermissionsCache[userId]?.[module];
}

export function getUserWarehouses(userId: string, role: UserRole): string[] {
  if (userWarehousesCache[userId] && userWarehousesCache[userId].length > 0) {
    return userWarehousesCache[userId];
  }

  if (role === 'WAREHOUSE') {
    return ['Central', 'Cropbio', 'Cropfert'];
  } else if (role === 'WAREHOUSE_BIO') {
    return ['Cropbio'];
  } else if (role === 'WAREHOUSE_FERT') {
    return ['Cropfert'];
  } else if (role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR' || role === 'ENGINEER') {
    return ['Central', 'Cropbio', 'Cropfert'];
  }

  return ['Central', 'Cropbio', 'Cropfert'];
}

export function canAccessWarehouse(userId: string, role: UserRole, warehouse: string): boolean {
  const allowedWarehouses = getUserWarehouses(userId, role);
  return allowedWarehouses.includes(warehouse);
}

export async function saveUserWarehouses(userId: string, warehouses: string[]): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_permissions')
        .update({ warehouses })
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          module: 'inventory',
          permissions: { view: true, create: false, edit: false, delete: false, export: false },
          warehouses
        });

      if (error) throw error;
    }

    userWarehousesCache[userId] = warehouses;
    return true;
  } catch (e) {
    console.error('Erro ao salvar permissões de almoxarifado:', e);
    return false;
  }
}

export function getAllowedModules(role: UserRole): ModuleId[] {
  const modules = Object.keys(PERMISSIONS_MATRIX[role]) as ModuleId[];
  return modules.filter(module => PERMISSIONS_MATRIX[role][module].view);
}

export const ROLE_DESCRIPTIONS: Record<UserRole, { label: string; description: string; color: string }> = {
  ADMIN: {
    label: 'Administrador',
    description: 'Acesso total ao sistema, incluindo gestão de usuários e configurações críticas.',
    color: 'purple'
  },
  MANAGER: {
    label: 'Gerente',
    description: 'Gestão completa de projetos, OS, equipamentos e relatórios. Sem acesso à gestão de usuários.',
    color: 'blue'
  },
  COORDINATOR: {
    label: 'Coordenador',
    description: 'Repassa serviços para executores e cadastra equipamentos. Gestão operacional de OS e agenda.',
    color: 'indigo'
  },
  EXECUTOR: {
    label: 'Prestador de Serviço',
    description: 'Acesso focado na execução de ordens de serviço. Visualização de projetos e agenda.',
    color: 'orange'
  },
  USER: {
    label: 'Usuário Comum',
    description: 'Abertura de OS e cadastro de equipamentos. Acesso à agenda de serviços. Sem acesso a módulos gerenciais.',
    color: 'slate'
  },
  WAREHOUSE: {
    label: 'Almoxarifado Geral',
    description: 'Supervisão completa de estoque, movimentações e fornecedores de todas as unidades.',
    color: 'amber'
  },
  WAREHOUSE_BIO: {
    label: 'Almoxarife CropBio',
    description: 'Gestão de estoque restrita à unidade CropBio. Visualização de OS e relatórios.',
    color: 'emerald'
  },
  WAREHOUSE_FERT: {
    label: 'Almoxarife CropFert',
    description: 'Gestão de estoque restrita à unidade CropFert. Visualização de OS e relatórios.',
    color: 'teal'
  }
};
