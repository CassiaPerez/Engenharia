import React, { useState } from 'react';
import { UserRole } from '../types';
import {
  PERMISSIONS_MATRIX,
  MODULE_LABELS,
  ROLE_DESCRIPTIONS,
  ModuleId,
  PermissionAction
} from '../services/permissions';

const PermissionsMatrix: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');

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

  const getColorClass = (role: UserRole) => {
    const color = ROLE_DESCRIPTIONS[role].color;
    return {
      bg: `bg-${color}-50`,
      text: `text-${color}-700`,
      border: `border-${color}-200`,
      bgDark: `bg-${color}-100`
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center">
            <i className="fas fa-shield-alt text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Matriz de Permissões (RBAC)</h3>
            <p className="text-sm text-slate-600">Controle de acesso baseado em funções</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Esta matriz define exatamente o que cada nível de usuário pode fazer em cada módulo do sistema.
          As permissões são aplicadas automaticamente em toda a aplicação.
        </p>
      </div>

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
                Permissões: {ROLE_DESCRIPTIONS[selectedRole].label}
              </h4>
              <p className="text-sm text-white/80">
                {ROLE_DESCRIPTIONS[selectedRole].description}
              </p>
            </div>
            <div className="text-4xl opacity-20">
              <i className="fas fa-user-shield"></i>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((module, idx) => {
                const perms = PERMISSIONS_MATRIX[selectedRole][module];
                const hasAnyPermission = Object.values(perms).some(p => p);

                return (
                  <tr
                    key={module}
                    className={`transition-colors ${
                      hasAnyPermission ? 'hover:bg-blue-50/50' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className={`px-6 py-4 font-bold sticky left-0 z-10 ${
                      hasAnyPermission ? 'text-slate-800 bg-white' : 'text-slate-400 bg-slate-50/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        {!hasAnyPermission && (
                          <i className="fas fa-lock text-xs text-slate-400"></i>
                        )}
                        {MODULE_LABELS[module]}
                      </div>
                    </td>
                    {actions.map(action => {
                      const hasPermission = perms[action];
                      return (
                        <td key={action} className="px-4 py-4 text-center">
                          {hasPermission ? (
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <i className="fas fa-check text-sm font-bold"></i>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-300">
                              <i className="fas fa-times text-sm"></i>
                            </div>
                          )}
                        </td>
                      );
                    })}
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
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Permitido</div>
              <div className="text-2xl font-bold text-emerald-700">
                {Object.values(PERMISSIONS_MATRIX[selectedRole]).reduce(
                  (acc, perms) => acc + Object.values(perms).filter(p => p).length,
                  0
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-emerald-700">Ações autorizadas para este perfil</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-slate-500 text-white flex items-center justify-center">
              <i className="fas fa-ban"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Negado</div>
              <div className="text-2xl font-bold text-slate-700">
                {Object.values(PERMISSIONS_MATRIX[selectedRole]).reduce(
                  (acc, perms) => acc + Object.values(perms).filter(p => !p).length,
                  0
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600">Ações bloqueadas para este perfil</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center">
              <i className="fas fa-cube"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Módulos</div>
              <div className="text-2xl font-bold text-blue-700">
                {Object.values(PERMISSIONS_MATRIX[selectedRole]).filter(
                  perms => perms.view
                ).length}
              </div>
            </div>
          </div>
          <p className="text-xs text-blue-700">Módulos acessíveis</p>
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <i className="fas fa-info-circle"></i>
          </div>
          <div className="text-sm text-amber-800 leading-relaxed">
            <strong>Importante:</strong> As permissões são aplicadas automaticamente em toda a aplicação.
            Botões e funcionalidades que o usuário não tem permissão para acessar ficam ocultos ou desabilitados.
            Apenas administradores podem modificar a matriz de permissões no código.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsMatrix;
