import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  ModuleId,
  ModulePermissions,
  FieldPermissions,
  MODULE_LABELS,
  PERMISSIONS_MATRIX,
  loadUserPermissions,
  saveUserPermissions,
  deleteUserPermissions,
  resetUserPermissions,
  getUserCustomPermissions,
  hasUserCustomPermissions,
  getFieldPermissions
} from '../services/permissions';

interface Props {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

const UserPermissionsEditor: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<Record<string, ModulePermissions>>({});
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, FieldPermissions>>({});
  const [hasCustom, setHasCustom] = useState(false);
  const [expandedModule, setExpandedModule] = useState<ModuleId | null>(null);

  useEffect(() => {
    loadPermissions();
  }, [user.id]);

  const loadPermissions = async () => {
    setLoading(true);
    await loadUserPermissions(user.id);
    const userPerms = getUserCustomPermissions(user.id);
    setCustomPermissions(userPerms);

    const osFieldPerms = getFieldPermissions(user.id, 'os');
    if (osFieldPerms) {
      setFieldPermissions({ os: osFieldPerms });
    }

    setHasCustom(hasUserCustomPermissions(user.id));
    setLoading(false);
  };

  const getEffectivePermissions = (module: ModuleId): ModulePermissions => {
    if (customPermissions[module]) {
      return customPermissions[module];
    }
    return PERMISSIONS_MATRIX[user.role]?.[module] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
      export: false
    };
  };

  const isCustomized = (module: ModuleId): boolean => {
    return !!customPermissions[module];
  };

  const togglePermission = (module: ModuleId, action: keyof ModulePermissions) => {
    const current = getEffectivePermissions(module);
    const newPermissions = {
      ...current,
      [action]: !current[action]
    };

    setCustomPermissions(prev => ({
      ...prev,
      [module]: newPermissions
    }));
  };

  const resetModulePermissions = (module: ModuleId) => {
    setCustomPermissions(prev => {
      const next = { ...prev };
      delete next[module];
      return next;
    });
    setFieldPermissions(prev => {
      const next = { ...prev };
      delete next[module];
      return next;
    });
  };

  const toggleFieldPermission = (module: ModuleId, fieldName: string) => {
    setFieldPermissions(prev => {
      const moduleFields = prev[module] || {};
      const currentValue = moduleFields[fieldName]?.edit || false;

      const newFields = {
        ...moduleFields,
        [fieldName]: { edit: !currentValue }
      };

      if (!currentValue === false) {
        delete newFields[fieldName];
      }

      return {
        ...prev,
        [module]: newFields
      };
    });
  };

  const OS_FIELDS = [
    { key: 'priority', label: 'Prioridade' },
    { key: 'executor_id', label: 'Executor' },
    { key: 'sla_date', label: 'SLA/Prazo' }
  ];

  const handleSave = async () => {
    setSaving(true);

    const rolePerms = PERMISSIONS_MATRIX[user.role];
    const modules = Object.keys(rolePerms) as ModuleId[];

    for (const module of modules) {
      const customPerm = customPermissions[module];
      const rolePerm = rolePerms[module];
      const fieldPerms = fieldPermissions[module];

      const isCustom = customPerm && JSON.stringify(customPerm) !== JSON.stringify(rolePerm);

      if (isCustom || fieldPerms) {
        await saveUserPermissions(user.id, module, customPerm || rolePerm, fieldPerms);
      } else if (!customPerm && !fieldPerms) {
        await deleteUserPermissions(user.id, module);
      }
    }

    const customModules = Object.keys(customPermissions) as ModuleId[];
    for (const module of customModules) {
      if (!modules.includes(module)) {
        await deleteUserPermissions(user.id, module);
      }
    }

    setSaving(false);
    onSave();
  };

  const handleResetAll = async () => {
    if (!confirm('Deseja resetar todas as permissões customizadas deste usuário? Ele voltará a usar apenas as permissões do seu perfil.')) {
      return;
    }

    setSaving(true);
    await resetUserPermissions(user.id);
    await loadPermissions();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-auto">
          <div className="text-center py-8">Carregando permissões...</div>
        </div>
      </div>
    );
  }

  const modules = Object.keys(PERMISSIONS_MATRIX[user.role]) as ModuleId[];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Permissões Customizadas</h2>
            <p className="text-gray-600 mt-1">
              Usuário: <span className="font-semibold">{user.name}</span> ({user.email})
            </p>
            <p className="text-gray-600">
              Perfil: <span className="font-semibold">{user.role}</span>
            </p>
            {hasCustom && (
              <p className="text-amber-600 text-sm mt-2 font-medium">
                Este usuário possui permissões customizadas
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Por padrão, cada usuário herda as permissões do seu perfil</li>
            <li>Você pode customizar permissões específicas para este usuário</li>
            <li>Módulos customizados são marcados com fundo amarelo</li>
            <li>Use "Resetar Módulo" para voltar às permissões do perfil</li>
          </ul>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left font-semibold">Módulo</th>
                <th className="border p-3 text-center font-semibold w-24">Ver</th>
                <th className="border p-3 text-center font-semibold w-24">Criar</th>
                <th className="border p-3 text-center font-semibold w-24">Editar</th>
                <th className="border p-3 text-center font-semibold w-24">Excluir</th>
                <th className="border p-3 text-center font-semibold w-24">Exportar</th>
                <th className="border p-3 text-center font-semibold w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {modules.map(module => {
                const perms = getEffectivePermissions(module);
                const customized = isCustomized(module);

                return (
                  <React.Fragment key={module}>
                  <tr className={customized ? 'bg-amber-50' : ''}>
                    <td className="border p-3 font-medium">
                      {MODULE_LABELS[module]}
                      {customized && (
                        <span className="ml-2 text-xs text-amber-600 font-semibold">
                          CUSTOMIZADO
                        </span>
                      )}
                    </td>
                    <td className="border p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.view}
                        onChange={() => togglePermission(module, 'view')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="border p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.create}
                        onChange={() => togglePermission(module, 'create')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="border p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.edit}
                        onChange={() => togglePermission(module, 'edit')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="border p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.delete}
                        onChange={() => togglePermission(module, 'delete')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="border p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.export}
                        onChange={() => togglePermission(module, 'export')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="border p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {module === 'os' && (
                          <button
                            onClick={() => setExpandedModule(expandedModule === 'os' ? null : 'os')}
                            className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                          >
                            {expandedModule === 'os' ? 'Ocultar Campos' : 'Configurar Campos'}
                          </button>
                        )}
                        {customized && (
                          <button
                            onClick={() => resetModulePermissions(module)}
                            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                          >
                            Resetar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {module === 'os' && expandedModule === 'os' && (
                    <tr>
                      <td colSpan={7} className="border p-4 bg-blue-50">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-blue-900">Permissões de Campos Específicos - Ordens de Serviço</h4>
                          <p className="text-sm text-blue-700 mb-3">
                            Configure quais campos específicos o usuário pode editar nas OS
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            {OS_FIELDS.map(field => {
                              const hasPermission = fieldPermissions.os?.[field.key]?.edit || false;
                              return (
                                <label
                                  key={field.key}
                                  className="flex items-center gap-2 p-3 bg-white rounded border border-blue-200 cursor-pointer hover:bg-blue-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={hasPermission}
                                    onChange={() => toggleFieldPermission('os', field.key)}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm font-medium">{field.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          {hasCustom && (
            <button
              onClick={handleResetAll}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Resetar Todas Permissões
            </button>
          )}
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Permissões'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsEditor;
