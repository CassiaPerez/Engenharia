
import React, { useState } from 'react';
import { ServiceType, ServiceCostType } from '../types';

interface Props {
  services: ServiceType[];
  setServices: React.Dispatch<React.SetStateAction<ServiceType[]>>;
}

const ServiceManager: React.FC<Props> = ({ services, setServices }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<ServiceType>>({ costType: ServiceCostType.HOURLY, unitValue: 0, team: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setServices(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: formData.name || '', 
      description: formData.description || '',
      team: formData.team || 'Geral', 
      costType: ServiceCostType.HOURLY, 
      unitValue: Number(formData.unitValue) || 0, 
      category: 'INTERNAL' 
    }]);
    setShowModal(false);
    setFormData({ costType: ServiceCostType.HOURLY, unitValue: 0, team: '' });
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Catálogo de Serviços</h2><p className="text-slate-500 text-base mt-1">Atividades padrão e Equipes.</p></div>
        <button onClick={() => setShowModal(true)} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2"><i className="fas fa-plus"></i> Novo Serviço</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map(srv => (
           <div key={srv.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
               <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"><i className="fas fa-tools text-xl"></i></div>
                   <div>
                       <h3 className="font-bold text-slate-800 text-base">{srv.name}</h3>
                       <p className="text-xs font-bold text-clean-primary uppercase tracking-wide">{srv.team || 'Time Geral'}</p>
                   </div>
               </div>
               <p className="text-sm text-slate-500 line-clamp-3 h-12 leading-relaxed">{srv.description}</p>
               <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Interno</div>
                  <span className="text-sm font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded">R$ {formatCurrency(srv.unitValue)} / h</span>
               </div>
           </div>
        ))}
      </div>
      {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="font-bold text-2xl mb-6 text-slate-800">Novo Serviço</h3>
                  <form onSubmit={handleSave} className="space-y-5">
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Nome do Serviço</label>
                        <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, name:e.target.value})} />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Time / Equipe Responsável</label>
                        <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" placeholder="Ex: Manutenção Elétrica" onChange={e=>setFormData({...formData, team:e.target.value})} />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Valor Unitário (R$ / Hora)</label>
                        <input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" placeholder="0,00" value={formData.unitValue} onChange={e=>setFormData({...formData, unitValue: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Descrição Detalhada</label>
                        <textarea className="w-full p-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary h-32" onChange={e=>setFormData({...formData, description:e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 mt-2">
                          <button type="button" onClick={()=>setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-lg text-base font-bold transition-colors">Cancelar</button>
                          <button type="submit" className="px-8 py-3 bg-clean-primary text-white rounded-lg text-base font-bold hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transform hover:-translate-y-0.5 transition-all">Salvar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ServiceManager;
