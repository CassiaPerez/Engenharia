import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import {
  PERMISSIONS_MATRIX,
  MODULE_LABELS,
  ROLE_DESCRIPTIONS,
  ModuleId,
  PermissionAction,
  ModulePermissions
} from '../services/permissions';
import { supabase } from '../services/supabase';

interface CustomPermission {
  id: string;
  role: UserRole;
  module: ModuleId;
  permissions: ModulePermissions;
}

const PermissionsEditor: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [customPermissions, setCustomPermissions] = useState<CustomPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<Record<string, ModulePermissions>>({});

  const roles: UserRole[] = ['ADMIN', 'MANAGER', 'EXECUTOR', 'USER', 'WAREHOUSE', 'WAREHOUSE_BIO', 'WAREHOUSE_FERT'];
  const modules = Object.keys(MODULE_LABELS) as ModuleId[];
  const actions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export'];

  const actionLabels: Record<PermissionAction, string> = {
    view: 'Visualizar',
    create: 'Criar',
    edit: 'Editar',
    delete: 'Excluir',
    export: 'Exportar'
  };

  const actionIcons: Record<PermissionAction, string> = {
    view: 'fa-eye',
    create: 'fa-plus',
    edit: 'fa-pencil-alt',
    delete: 'fa-trash',
    export: 'fa-download'
  };

  useEffect(() => {
    loadCustomPermissions();
  }, []);

  const loadCustomPermissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) throw error;

      const formatted: CustomPermission[] = (data || []).map(item => ({
        id: item.id,
        role: item.role as UserRole,
        module: item.module as ModuleId,
        permissions: item.permissions as ModulePermissions
      }));

      setCustomPermissions(formatted);
    } catch (e) {
      console.error('Erro ao carregar permissões:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getEffectivePermissions = (role: UserRole, module: ModuleId): ModulePermissions => {
    const key = `${role}-${module}`;
    if (editedPermissions[key]) {
      return editedPermissions[key];
    }

    const custom = customPermissions.find(cp => cp.role === role && cp.module === module);
    if (custom) {
      return custom.permissions;
    }

    return PERMISSIONS_MATRIX[role][module];
  };

  const togglePermission = (module: ModuleId, action: PermissionAction) => {
    const key = `${selectedRole}-${module}`;
    const current = getEffectivePermissions(selectedRole, module);

    setEditedPermissions(prev => ({
      ...prev,
      [key]: {
        ...current,
        [action]: !current[action]
      }
    }));
  };

  const savePermissions = async () => {
    setIsSaving(true);
    try {
      for (const [key, permissions] of Object.entries(editedPermissions)) {
        const [role, module] = key.split('-') as [UserRole, ModuleId];

        const existing = customPermissions.find(cp => cp.role === role && cp.module === module);

        if (existing) {
          const { error } = await supabase
            .from('role_permissions')
            .update({ permissions, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('role_permissions')
            .insert({
              role,
              module,
              permissions
            });

          if (error) throw error;
        }
      }

      await loadCustomPermissions();
      setEditedPermissions({});
      alert('Permissões salvas com sucesso! As alterações serão aplicadas no próximo login dos usuários.');
    } catch (e: any) {
      console.error('Erro ao salvar:', e);
      alert('Erro ao salvar permissões: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = async (role: UserRole, module: ModuleId) => {
    if (!confirm(`Tem certeza que deseja restaurar as permissões padrão de "${MODULE_LABELS[module]}" para "${ROLE_DESCRIPTIONS[role].label}"?`)) {
      return;
    }

    try {
      const existing = customPermissions.find(cp => cp.role === role && cp.module === module);

      if (existing) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
      }

      const key = `${role}-${module}`;
      const newEdited = { ...editedPermissions };
      delete newEdited[key];
      setEditedPermissions(newEdited);

      await loadCustomPermissions();
      alert('Permissões restauradas ao padrão!');
    } catch (e: any) {
      console.error('Erro ao restaurar:', e);
      alert('Erro ao restaurar permissões: ' + e.message);
    }
  };

  const hasUnsavedChanges = Object.keys(editedPermissions).length > 0;
  const isCustomized = (role: UserRole, module: ModuleId) => {
    return customPermissions.some(cp => cp.role === role && cp.module === module);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-clean-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center">
            <i className="fas fa-user-shield text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Editor de Permissões (Admin)</h3>
            <p className="text-sm text-slate-600">Configure permissões customizadas por função e módulo</p>
          </div>
        </div>
        <p className="text-sm text-amber-800 leading-relaxed">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <strong>Atenção:</strong> Alterações nas permissões afetam o controle de acesso de todos os usuários do sistema.
          As mudanças serão aplicadas no próximo login.
        </p>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center">
              <i className="fas fa-info-circle"></i>
            </div>
            <div>
              <div className="font-bold text-blue-800">Você tem alterações não salvas</div>
              <div className="text-sm text-blue-700">Clique em "Salvar Alterações" para aplicar as mudanças</div>
            </div>
          </div>
          <button
            onClick={savePermissions}
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Salvando...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {roles.map(role => {
          const roleInfo = ROLE_DESCRIPTIONS[role];
          const isSelected = selectedRole === role;
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'bg-clean-primary border-clean-primary shadow-lg shadow-clean-primary/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                isSelected ? 'text-white' : 'text-slate-500'
              }`}>
                {roleInfo.label}
              </div>
              <div className={`text-xs leading-snug ${
                isSelected ? 'text-white/90' : 'text-slate-600'
              }`}>
                {roleInfo.description}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold mb-1">
                Editando: {ROLE_DESCRIPTIONS[selectedRole].label}
              </h4>
              <p className="text-sm text-white/80">
                Clique nos ícones para ativar/desativar permissões
              </p>
            </div>
            <div className="text-4xl opacity-20">
              <i className="fas fa-edit"></i>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider sticky left-0 bg-slate-50 z-10">
                  Módulo
                </th>
                {actions.map(action => (
                  <th key={action} className="px-4 py-4 text-center font-bold text-slate-700 uppercase text-xs tracking-wider">
                    <div className="flex flex-col items-center gap-1">
                      <i className={`fas ${actionIcons[action]} text-base`}></i>
                      <span>{actionLabels[action]}</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-4 text-center font-bold text-slate-700 uppercase text-xs tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map(module => {
                const perms = getEffectivePermissions(selectedRole, module);
                const hasAnyPermission = Object.values(perms).some(p => p);
                const customized = isCustomized(selectedRole, module);
                const key = `${selectedRole}-${module}`;
                const hasChanges = !!editedPermissions[key];

                return (
                  <tr
                    key={module}
                    className={`transition-colors ${
                      hasChanges ? 'bg-blue-50' : hasAnyPermission ? 'hover:bg-slate-50' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className={`px-6 py-4 font-bold sticky left-0 z-10 ${
                      hasChanges ? 'bg-blue-50' : hasAnyPermission ? 'text-slate-800 bg-white' : 'text-slate-400 bg-slate-50/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        {customized && (
                          <i className="fas fa-star text-xs text-amber-500" title="Permissões customizadas"></i>
                        )}
                        {hasChanges && (
                          <i className="fas fa-edit text-xs text-blue-600" title="Alterações não salvas"></i>
                        )}
                        {MODULE_LABELS[module]}
                      </div>
                    </td>
                    {actions.map(action => {
                      const hasPermission = perms[action];
                      return (
                        <td key={action} className="px-4 py-4 text-center">
                          <button
                            onClick={() => togglePermission(module, action)}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                              hasPermission
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={`Clique para ${hasPermission ? 'desativar' : 'ativar'}`}
                          >
                            <i className={`fas ${hasPermission ? 'fa-check' : 'fa-times'} text-sm font-bold`}></i>
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-center">
                      {customized && (
                        <button
                          onClick={() => resetToDefault(selectedRole, module)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                          title="Restaurar permissões padrão"
                        >
                          <i className="fas fa-undo mr-1"></i>
                          Padrão
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Permitidas</div>
              <div className="text-2xl font-bold text-emerald-700">
                {modules.reduce((acc, module) => {
                  const perms = getEffectivePermissions(selectedRole, module);
                  return acc + Object.values(perms).filter(p => p).length;
                }, 0)}
              </div>
            </div>
          </div>
          <p className="text-xs text-emerald-700">Ações autorizadas</p>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <i className="fas fa-star"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Customizadas</div>
              <div className="text-2xl font-bold text-amber-700">
                {customPermissions.filter(cp => cp.role === selectedRole).length}
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-700">Módulos com permissões personalizadas</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center">
              <i className="fas fa-cube"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Módulos</div>
              <div className="text-2xl font-bold text-blue-700">
                {modules.filter(module => getEffectivePermissions(selectedRole, module).view).length}
              </div>
            </div>
          </div>
          <p className="text-xs text-blue-700">Módulos acessíveis</p>
        </div>
      </div>
    </div>
  );
};

export default PermissionsEditor;
