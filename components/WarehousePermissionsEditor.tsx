import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUserWarehouses, saveUserWarehouses, loadUserPermissions } from '../services/permissions';

interface Props {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

const AVAILABLE_WAREHOUSES = [
  { id: 'Central', label: 'Almoxarifado Central', icon: 'fa-building', color: 'slate' },
  { id: 'Cropbio', label: 'Almoxarifado Cropbio', icon: 'fa-leaf', color: 'emerald' },
  { id: 'Cropfert', label: 'Almoxarifado Cropfert', icon: 'fa-seedling', color: 'blue' }
];

const WarehousePermissionsEditor: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);

  useEffect(() => {
    loadWarehouses();
  }, [user.id]);

  const loadWarehouses = async () => {
    setLoading(true);
    await loadUserPermissions(user.id);
    const warehouses = getUserWarehouses(user.id, user.role);
    setSelectedWarehouses(warehouses);
    setLoading(false);
  };

  const toggleWarehouse = (warehouseId: string) => {
    setSelectedWarehouses(prev => {
      if (prev.includes(warehouseId)) {
        return prev.filter(w => w !== warehouseId);
      } else {
        return [...prev, warehouseId];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveUserWarehouses(user.id, selectedWarehouses);
    setSaving(false);

    if (success) {
      alert('Permissões de almoxarifado salvas com sucesso!');
      onSave();
    } else {
      alert('Erro ao salvar permissões de almoxarifado.');
    }
  };

  const getDefaultWarehouses = () => {
    if (user.role === 'WAREHOUSE') return ['Central', 'Cropbio', 'Cropfert'];
    if (user.role === 'WAREHOUSE_BIO') return ['Cropbio'];
    if (user.role === 'WAREHOUSE_FERT') return ['Cropfert'];
    if (user.role === 'ADMIN') return ['Central', 'Cropbio', 'Cropfert'];
    return [];
  };

  const defaultWarehouses = getDefaultWarehouses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <i className="fas fa-warehouse"></i>
                Permissões de Almoxarifado
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Configure quais almoxarifados {user.name} pode acessar
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-4xl text-amber-600 mb-4"></i>
              <p className="text-slate-600">Carregando permissões...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <i className="fas fa-info-circle text-blue-600 mt-1"></i>
                <div className="flex-1 text-sm text-blue-900">
                  <p className="font-semibold mb-1">Permissões Padrão do Perfil ({user.role})</p>
                  <p className="text-blue-700">
                    {defaultWarehouses.length > 0
                      ? `Por padrão, este perfil tem acesso a: ${defaultWarehouses.join(', ')}`
                      : 'Este perfil não tem acesso padrão a almoxarifados'}
                  </p>
                  <p className="text-blue-700 mt-2">
                    Você pode customizar essas permissões abaixo para este usuário específico.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {AVAILABLE_WAREHOUSES.map(warehouse => {
                const isSelected = selectedWarehouses.includes(warehouse.id);
                const colorClasses = {
                  slate: {
                    bg: 'bg-slate-100',
                    border: 'border-slate-300',
                    text: 'text-slate-700',
                    icon: 'text-slate-600',
                    selected: 'bg-slate-600 border-slate-700'
                  },
                  emerald: {
                    bg: 'bg-emerald-50',
                    border: 'border-emerald-200',
                    text: 'text-emerald-700',
                    icon: 'text-emerald-600',
                    selected: 'bg-emerald-600 border-emerald-700'
                  },
                  blue: {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    text: 'text-blue-700',
                    icon: 'text-blue-600',
                    selected: 'bg-blue-600 border-blue-700'
                  }
                }[warehouse.color];

                return (
                  <button
                    key={warehouse.id}
                    onClick={() => toggleWarehouse(warehouse.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${colorClasses.selected} text-white shadow-lg`
                        : `${colorClasses.bg} ${colorClasses.border} hover:shadow-md`
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-white/20' : 'bg-white'
                      }`}>
                        <i className={`fas ${warehouse.icon} text-xl ${
                          isSelected ? 'text-white' : colorClasses.icon
                        }`}></i>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-lg">{warehouse.label}</div>
                        <div className={`text-sm ${isSelected ? 'text-white/80' : 'text-slate-600'}`}>
                          {warehouse.id}
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-white bg-white'
                          : `${colorClasses.border} bg-white`
                      }`}>
                        {isSelected && <i className={`fas fa-check ${colorClasses.icon}`}></i>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedWarehouses.length === 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-red-600 mt-1"></i>
                  <div className="flex-1 text-sm text-red-900">
                    <p className="font-semibold">Atenção!</p>
                    <p className="text-red-700">
                      Nenhum almoxarifado selecionado. O usuário não terá acesso ao módulo de inventário.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Salvando...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Salvar Permissões
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehousePermissionsEditor;
