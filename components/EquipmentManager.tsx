
import React, { useState } from 'react';
import { Equipment, User } from '../types';
import { supabase } from '../services/supabase';
import ModalPortal from './ModalPortal';

interface Props {
  equipments: Equipment[];
  setEquipments: React.Dispatch<React.SetStateAction<Equipment[]>>;
  currentUser: User;
}

const EquipmentManager: React.FC<Props> = ({ equipments, setEquipments, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Equipment>>({ status: 'ACTIVE' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (editingId) {
            const updated = { ...formData, id: editingId } as Equipment;
            setEquipments(prev => prev.map(eq => eq.id === editingId ? updated : eq));

            const { error } = await supabase.from('equipments').upsert({
                id: editingId,
                json_content: updated
            });
            if (error) throw error;
        } else {
            const newEquipment: Equipment = {
              id: Math.random().toString(36).substr(2, 9),
              code: formData.code || '',
              name: formData.name || '',
              description: formData.description || '',
              location: formData.location || '',
              model: formData.model || '',
              serialNumber: formData.serialNumber || '',
              manufacturer: formData.manufacturer || '',
              status: formData.status || 'ACTIVE',
              notes: formData.notes || ''
            };
            setEquipments(prev => [...prev, newEquipment]);

            const { error } = await supabase.from('equipments').insert({
                id: newEquipment.id,
                json_content: newEquipment
            });
            if (error) throw error;
        }
        setShowModal(false);
        setFormData({ status: 'ACTIVE' });
        setEditingId(null);
    } catch (e) {
        console.error('Erro ao salvar:', e);
        alert('Erro ao salvar no banco de dados.');
    }
  };

  const handleEdit = (eq: Equipment) => {
      setFormData(eq);
      setEditingId(eq.id);
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem excluir equipamentos.');
          return;
      }
      
      if (confirm('Tem certeza que deseja excluir este equipamento?')) {
          setEquipments(prev => prev.filter(eq => eq.id !== id));
          try {
              const { error } = await supabase.from('equipments').delete().eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error('Erro ao excluir:', e);
              alert('Erro ao excluir do banco de dados.');
          }
      }
  };

  const openNew = () => {
      setFormData({ status: 'ACTIVE', code: '', name: '', description: '', location: '', model: '', serialNumber: '', manufacturer: '' });
      setEditingId(null);
      setShowModal(true);
  };

  const uniqueCompanies = Array.from(new Set(equipments.map(eq => eq.location).filter(Boolean)));
  const uniqueManufacturers = Array.from(new Set(equipments.map(eq => eq.manufacturer).filter(Boolean)));

  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = !searchTerm ||
      eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany = !filterCompany || eq.location === filterCompany;
    const matchesStatus = !filterStatus || eq.status === filterStatus;
    const matchesManufacturer = !filterManufacturer || eq.manufacturer === filterManufacturer;

    return matchesSearch && matchesCompany && matchesStatus && matchesManufacturer;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCompany('');
    setFilterStatus('');
    setFilterManufacturer('');
  };

  const hasActiveFilters = searchTerm || filterCompany || filterStatus || filterManufacturer;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Equipamentos</h2>
            <p className="text-slate-500 text-base mt-1">Gestão de ativos industriais e frota.</p>
        </div>
        <button onClick={openNew} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2">
            <i className="fas fa-plus"></i> Novo Equipamento
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-filter text-clean-primary"></i>
            <h3 className="text-sm font-bold text-slate-700 uppercase">Filtros</h3>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs font-bold text-slate-500 hover:text-clean-primary transition-colors flex items-center gap-1">
              <i className="fas fa-times"></i> Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Buscar</label>
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                placeholder="TAG, nome ou descrição..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:border-clean-primary focus:outline-none focus:ring-2 focus:ring-clean-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Empresa</label>
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-clean-primary focus:outline-none focus:ring-2 focus:ring-clean-primary/20 transition-all"
            >
              <option value="">Todas</option>
              {uniqueCompanies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-clean-primary focus:outline-none focus:ring-2 focus:ring-clean-primary/20 transition-all"
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="MAINTENANCE">Manutenção</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Fabricante</label>
            <select
              value={filterManufacturer}
              onChange={e => setFilterManufacturer(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-clean-primary focus:outline-none focus:ring-2 focus:ring-clean-primary/20 transition-all"
            >
              <option value="">Todos</option>
              {uniqueManufacturers.map(mfr => (
                <option key={mfr} value={mfr}>{mfr}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Exibindo <span className="font-bold text-clean-primary">{filteredEquipments.length}</span> de <span className="font-bold">{equipments.length}</span> equipamentos
          </p>
        </div>
      </div>

      {filteredEquipments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-search text-2xl text-slate-400"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum equipamento encontrado</h3>
          <p className="text-slate-500 text-sm mb-4">
            {hasActiveFilters
              ? 'Tente ajustar os filtros ou limpar a busca.'
              : 'Cadastre o primeiro equipamento para começar.'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipments.map(eq => (
            <div key={eq.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col group relative">
               <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-xl bg-slate-50 text-slate-600">
                       <i className="fas fa-cogs"></i>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded">{eq.code}</span>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${eq.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : eq.status === 'MAINTENANCE' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {eq.status === 'ACTIVE' ? 'Ativo' : eq.status === 'MAINTENANCE' ? 'Manutenção' : 'Inativo'}
                        </span>
                   </div>
               </div>
               
               <h3 className="font-bold text-lg text-slate-800 mb-1">{eq.name}</h3>
               <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{eq.description}</p>
               
               <div className="space-y-2 mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <p><span className="font-bold text-slate-400 text-xs uppercase block">Empresa:</span> {eq.location}</p>
                   <p><span className="font-bold text-slate-400 text-xs uppercase block">Modelo/Série:</span> {eq.model} / {eq.serialNumber}</p>
               </div>

               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleEdit(eq)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all" title="Editar">
                       <i className="fas fa-pencil-alt text-xs"></i>
                   </button>
                   {currentUser.role === 'ADMIN' && (
                       <button onClick={() => handleDelete(eq.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-all" title="Excluir">
                           <i className="fas fa-trash text-xs"></i>
                       </button>
                   )}
               </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                  <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 my-8">
                      <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                          <div>
                              <h3 className="font-bold text-xl text-slate-800">{editingId ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
                              <p className="text-sm text-slate-500 mt-1">Cadastro de ativo.</p>
                          </div>
                          <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"><i className="fas fa-times"></i></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 min-h-0">
                          <form id="equipmentForm" onSubmit={handleSave} className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">TAG (Código)</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.code || ''} onChange={e=>setFormData({...formData, code:e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Status</label><select className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})}><option value="ACTIVE">Ativo</option><option value="MAINTENANCE">Manutenção</option><option value="INACTIVE">Inativo</option></select></div>
                              </div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.name || ''} onChange={e=>setFormData({...formData, name:e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Descrição</label><input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.description || ''} onChange={e=>setFormData({...formData, description:e.target.value})} /></div>
                              <div className="grid grid-cols-2 gap-6">
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Modelo</label><input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.model || ''} onChange={e=>setFormData({...formData, model:e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nº Série</label><input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.serialNumber || ''} onChange={e=>setFormData({...formData, serialNumber:e.target.value})} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Fabricante</label><input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.manufacturer || ''} onChange={e=>setFormData({...formData, manufacturer:e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Empresa</label><input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.location || ''} onChange={e=>setFormData({...formData, location:e.target.value})} /></div>
                              </div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Obs</label><textarea className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-sm h-24 transition-all" value={formData.notes || ''} onChange={e=>setFormData({...formData, notes:e.target.value})} /></div>
                          </form>
                      </div>
                      <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0"><button type="button" onClick={()=>setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button><button type="submit" form="equipmentForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg transition-all">Salvar</button></div>
                  </div>
              </div>
            </div>
          </ModalPortal>
      )}
    </div>
  );
};

export default EquipmentManager;
