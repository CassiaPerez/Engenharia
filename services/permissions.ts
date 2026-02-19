import { UserRole } from '../types';
import { supabase } from './supabase';

let customPermissionsCache: Record<string, ModulePermissions> = {};

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

function getEffectivePermissions(role: UserRole, module: ModuleId): ModulePermissions {
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
  action: PermissionAction
): boolean {
  const modulePerms = getEffectivePermissions(role, module);
  if (!modulePerms) return false;
  return modulePerms[action];
}

export function canAccessModule(role: UserRole, module: ModuleId): boolean {
  return hasPermission(role, module, 'view');
}

export function getModulePermissions(role: UserRole, module: ModuleId): ModulePermissions {
  return getEffectivePermissions(role, module);
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
