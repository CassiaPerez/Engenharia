import React, { useState } from 'react';
import { Equipment, User } from '../types';
import { supabase } from '../services/supabase';
import ModalPortal from './ModalPortal';

interface Props {
  equipments: Equipment[];
  currentUser: User;
  onSave: (equip: Equipment) => void;
  setEquipments: React.Dispatch<React.SetStateAction<Equipment[]>>;
}

const EquipmentManager: React.FC<Props> = ({ equipments, currentUser, onSave, setEquipments }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [formData, setFormData] = useState<Partial<Equipment>>({
    status: 'ACTIVE',
    code: '',
    name: '',
    description: '',
    location: '',
    model: '',
    serialNumber: '',
    manufacturer: '',
  });

  const openEdit = (equip: Equipment) => {
    setEditingEquipment(equip);
    setFormData(equip);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Apenas administradores podem excluir equipamentos.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;

    try {
      const { error } = await supabase.from('equipments').delete().eq('id', id);
      if (error) throw error;

      // Só remove do estado depois de confirmar exclusão no banco
      setEquipments((prev) => prev.filter((eq) => eq.id !== id));
    } catch (e) {
      console.error('Erro ao excluir:', e);
      alert('Erro ao excluir do banco de dados. O item não foi removido.');
    }
  };

  const openNew = () => {
    setFormData({
      status: 'ACTIVE',
      code: '',
      name: '',
      description: '',
      location: '',
      model: '',
      serialNumber: '',
      manufacturer: '',
    });
    setEditingEquipment(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEquipment(null);
  };

  const handleChange = (field: keyof Equipment, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      alert('Código e Nome são obrigatórios.');
      return;
    }

    const equip: Equipment = {
      id: editingEquipment?.id || crypto.randomUUID(),
      code: formData.code!,
      name: formData.name!,
      description: formData.description || '',
      location: formData.location || '',
      model: formData.model || '',
      serialNumber: formData.serialNumber || '',
      manufacturer: formData.manufacturer || '',
      status: (formData.status as any) || 'ACTIVE',
      createdAt: editingEquipment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(equip);
    closeModal();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Equipamentos</h2>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={openNew}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
          >
            Novo Equipamento
          </button>
        )}
      </div>

      <div className="space-y-3">
        {equipments.map((eq) => (
          <div
            key={eq.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-white font-medium">
                {eq.code} — {eq.name}
              </div>
              <div className="text-zinc-400 text-sm">{eq.location || 'Sem localização'}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openEdit(eq)}
                className="px-3 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition"
              >
                Editar
              </button>

              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={() => handleDelete(eq.id)}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}

        {equipments.length === 0 && (
          <div className="text-zinc-400">Nenhum equipamento cadastrado.</div>
        )}
      </div>

      {showModal && (
        <ModalPortal onClose={closeModal}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-xl">
            <h3 className="text-white text-lg font-semibold mb-4">
              {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-300 text-sm">Código *</label>
                <input
                  value={formData.code || ''}
                  onChange={(e) => handleChange('code', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-sm">Nome *</label>
                <input
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-zinc-300 text-sm">Descrição</label>
                <input
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-sm">Localização</label>
                <input
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-sm">Status</label>
                <select
                  value={(formData.status as any) || 'ACTIVE'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 text-sm">Modelo</label>
                <input
                  value={formData.model || ''}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-sm">Nº Série</label>
                <input
                  value={formData.serialNumber || ''}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-zinc-300 text-sm">Fabricante</label>
                <input
                  value={formData.manufacturer || ''}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default EquipmentManager;