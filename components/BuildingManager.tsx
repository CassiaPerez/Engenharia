
import React, { useState } from 'react';
import { Building, User } from '../types';
import { supabase } from '../services/supabase';
import ModalPortal from './ModalPortal';

interface Props {
  buildings: Building[];
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
  currentUser: User;
}

const BuildingManager: React.FC<Props> = ({ buildings, setBuildings, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Building>>({ type: 'CORPORATE' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (editingId) {
            const updated = { ...formData, id: editingId } as Building;
            setBuildings(prev => prev.map(b => b.id === editingId ? updated : b));

            const { error } = await supabase.from('buildings').upsert({
                id: editingId,
                json_content: updated
            });
            if (error) throw error;
        } else {
            const newBuilding: Building = {
              id: Math.random().toString(36).substr(2, 9),
              name: formData.name || '',
              address: formData.address || '',
              city: formData.city || '',
              manager: formData.manager || '',
              type: formData.type || 'CORPORATE',
              notes: formData.notes || ''
            };
            setBuildings(prev => [...prev, newBuilding]);

            const { error } = await supabase.from('buildings').insert({
                id: newBuilding.id,
                json_content: newBuilding
            });
            if (error) throw error;
        }
        setShowModal(false);
        setFormData({ type: 'CORPORATE' });
        setEditingId(null);
    } catch (e) {
        console.error('Erro ao salvar:', e);
        alert('Erro ao salvar no banco de dados.');
    }
  };

  const handleEdit = (b: Building) => {
      setFormData(b);
      setEditingId(b.id);
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem excluir edifícios.');
          return;
      }
      
      if (confirm('Tem certeza que deseja excluir este edifício?')) {
          setBuildings(prev => prev.filter(b => b.id !== id));
          
          try {
              const { error } = await supabase.from('buildings').delete().eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error('Erro ao excluir do banco:', e);
              alert('Erro ao excluir do Supabase. Verifique se o script de banco de dados (Documentação) foi executado corretamente.');
          }
      }
  };

  const openNew = () => {
      setFormData({ 
          type: 'CORPORATE',
          name: '',
          address: '',
          city: '',
          manager: '',
          notes: ''
      });
      setEditingId(null);
      setShowModal(true);
  };

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'CORPORATE': return 'Corporativo / Escritório';
          case 'INDUSTRIAL': return 'Industrial / Fábrica';
          case 'LOGISTICS': return 'Logístico / CD';
          default: return type;
      }
  };

  const getTypeColor = (type: string) => {
      switch(type) {
          case 'CORPORATE': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'INDUSTRIAL': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'LOGISTICS': return 'bg-purple-100 text-purple-700 border-purple-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Edifícios e Facilities</h2><p className="text-slate-500 text-base mt-1">Gestão de prédios, galpões e locais de manutenção.</p></div>
        <button onClick={openNew} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2"><i className="fas fa-plus"></i> Novo Edifício</button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map(b => (
           <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col group relative">
               <div className="flex justify-between items-start mb-4">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-xl bg-slate-50 text-slate-600`}>
                       <i className="fas fa-building"></i>
                   </div>
                   <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${getTypeColor(b.type)}`}>
                       {getTypeLabel(b.type)}
                   </span>
               </div>
               
               <h3 className="font-bold text-lg text-slate-800 mb-1">{b.name}</h3>
               <p className="text-sm text-slate-500 mb-4 flex items-center gap-2"><i className="fas fa-map-marker-alt text-clean-primary"></i> {b.city}</p>
               
               <div className="space-y-2 mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <p><span className="font-bold text-slate-400 text-xs uppercase block">Endereço:</span> {b.address}</p>
                   <p><span className="font-bold text-slate-400 text-xs uppercase block">Gestor Local:</span> {b.manager}</p>
               </div>
               
               {b.notes && <p className="text-xs text-slate-400 italic mt-auto border-t border-slate-100 pt-2">{b.notes}</p>}

               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleEdit(b)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all" title="Editar">
                       <i className="fas fa-pencil-alt text-xs"></i>
                   </button>
                   {currentUser.role === 'ADMIN' && (
                       <button onClick={() => handleDelete(b.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-all" title="Excluir (Admin)">
                           <i className="fas fa-trash text-xs"></i>
                       </button>
                   )}
               </div>
           </div>
        ))}
      </div>

      {showModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                  <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 my-8">
                      <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                          <div>
                              <h3 className="font-bold text-xl text-slate-800">{editingId ? 'Editar Edifício' : 'Novo Edifício'}</h3>
                              <p className="text-sm text-slate-500 mt-1">Cadastro de unidade física.</p>
                          </div>
                          <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"><i className="fas fa-times"></i></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 min-h-0">
                          <form id="buildingForm" onSubmit={handleSave} className="space-y-6">
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome do Edifício</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 transition-all" value={formData.name || ''} onChange={e=>setFormData({...formData, name:e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tipo</label><select className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})}><option value="CORPORATE">Corporativo</option><option value="INDUSTRIAL">Industrial</option><option value="LOGISTICS">Logístico</option></select></div>
                              <div className="grid grid-cols-2 gap-6"><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cidade</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.city || ''} onChange={e=>setFormData({...formData, city:e.target.value})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Gestor</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.manager || ''} onChange={e=>setFormData({...formData, manager:e.target.value})} /></div></div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Endereço</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all" value={formData.address || ''} onChange={e=>setFormData({...formData, address:e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Obs</label><textarea className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-sm h-24 transition-all" value={formData.notes || ''} onChange={e=>setFormData({...formData, notes:e.target.value})} /></div>
                          </form>
                      </div>
                      <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0"><button type="button" onClick={()=>setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button><button type="submit" form="buildingForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg transition-all">Salvar</button></div>
                  </div>
              </div>
            </div>
          </ModalPortal>
      )}
    </div>
  );
};

export default BuildingManager;
