
import React, { useState } from 'react';
import { ServiceType, ServiceCostType, User } from '../types';
import { supabase } from '../services/supabase';
import ModalPortal from './ModalPortal';

interface Props {
  services: ServiceType[];
  setServices: React.Dispatch<React.SetStateAction<ServiceType[]>>;
  currentUser: User;
}

const ServiceManager: React.FC<Props> = ({ services, setServices, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<ServiceType>>({ costType: ServiceCostType.HOURLY, unitValue: 0, team: '', category: 'INTERNAL' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        setServices(prev => prev.map(s => s.id === editingId ? { ...s, ...formData } as ServiceType : s));
    } else {
        setServices(prev => [...prev, { 
          id: Math.random().toString(36).substr(2, 9), 
          name: formData.name || '', 
          description: formData.description || '',
          team: formData.team || 'Geral', 
          costType: ServiceCostType.HOURLY, 
          unitValue: Number(formData.unitValue) || 0, 
          category: formData.category || 'INTERNAL' 
        }]);
    }
    
    setShowModal(false);
    setFormData({ costType: ServiceCostType.HOURLY, unitValue: 0, team: '', category: 'INTERNAL' });
    setEditingId(null);
  };

  const handleEdit = (service: ServiceType) => {
      setFormData(service);
      setEditingId(service.id);
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem excluir serviços.');
          return;
      }

      if (confirm('Deseja realmente excluir este serviço?')) {
          setServices(prev => prev.filter(s => s.id !== id));
          
          try {
              const { error } = await supabase.from('services').delete().eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error('Erro ao excluir serviço do banco:', e);
              alert('Erro ao excluir do Supabase. Verifique se o script de banco de dados (Documentação) foi executado corretamente.');
          }
      }
  };

  const openNew = () => {
      setFormData({ 
          costType: ServiceCostType.HOURLY, 
          unitValue: 0, 
          team: '', 
          category: 'INTERNAL',
          name: '',
          description: ''
      });
      setEditingId(null);
      setShowModal(true);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Catálogo de Serviços</h2><p className="text-slate-500 text-base mt-1">Atividades padrão e Equipes.</p></div>
        <button onClick={openNew} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2"><i className="fas fa-plus"></i> Novo Serviço</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map(srv => (
           <div key={srv.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all group relative">
               <div className="flex items-center gap-4 mb-4">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${srv.category === 'EXTERNAL' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                       <i className={`fas ${srv.category === 'EXTERNAL' ? 'fa-handshake' : 'fa-tools'} text-xl`}></i>
                   </div>
                   <div>
                       <h3 className="font-bold text-slate-800 text-base">{srv.name}</h3>
                       <p className="text-xs font-bold text-clean-primary uppercase tracking-wide">{srv.team || 'Time Geral'}</p>
                   </div>
               </div>
               <p className="text-sm text-slate-500 line-clamp-3 h-12 leading-relaxed">{srv.description}</p>
               <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${srv.category === 'EXTERNAL' ? 'text-orange-500' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${srv.category === 'EXTERNAL' ? 'bg-orange-500' : 'bg-emerald-400'}`}></span> 
                      {srv.category === 'EXTERNAL' ? 'Terceiro/Externo' : 'Interno'}
                  </div>
                  <span className="text-sm font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded">R$ {formatCurrency(srv.unitValue)} / h</span>
               </div>

               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleEdit(srv)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all" title="Editar">
                       <i className="fas fa-pencil-alt text-xs"></i>
                   </button>
                   {currentUser.role === 'ADMIN' && (
                       <button onClick={() => handleDelete(srv.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-all" title="Excluir (Admin)">
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
                              <h3 className="font-bold text-xl text-slate-800">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                              <p className="text-sm text-slate-500 mt-1">Configuração de mão de obra e equipes.</p>
                          </div>
                          <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"><i className="fas fa-times"></i></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 min-h-0">
                          <form id="serviceForm" onSubmit={handleSave} className="space-y-6">
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome do Serviço</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" value={formData.name || ''} onChange={e=>setFormData({...formData, name:e.target.value})} /></div>
                              <div className="grid grid-cols-2 gap-6">
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Categoria</label><select className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value as any})}><option value="INTERNAL">Interno</option><option value="EXTERNAL">Terceiro / Externo</option></select></div>
                                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Valor Unitário (R$/h)</label><input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" value={formData.unitValue} onChange={e=>setFormData({...formData, unitValue: Number(e.target.value)})} /></div>
                              </div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Time / Equipe</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" value={formData.team || ''} onChange={e=>setFormData({...formData, team:e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Descrição</label><textarea className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary h-32 transition-all" value={formData.description || ''} onChange={e=>setFormData({...formData, description:e.target.value})} /></div>
                          </form>
                      </div>
                      <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0"><button type="button" onClick={()=>setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold border border-transparent hover:border-slate-200 transition-all">Cancelar</button><button type="submit" form="serviceForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg transition-all">Salvar</button></div>
                  </div>
              </div>
            </div>
          </ModalPortal>
      )}
    </div>
  );
};

export default ServiceManager;
