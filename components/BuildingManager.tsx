
import React, { useState } from 'react';
import { Building } from '../types';

interface Props {
  buildings: Building[];
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
}

const BuildingManager: React.FC<Props> = ({ buildings, setBuildings }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Building>>({ type: 'CORPORATE' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBuildings(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: formData.name || '', 
      address: formData.address || '',
      city: formData.city || '',
      manager: formData.manager || '',
      type: formData.type || 'CORPORATE',
      notes: formData.notes || ''
    }]);
    setShowModal(false);
    setFormData({ type: 'CORPORATE' });
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
        <button onClick={() => setShowModal(true)} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2"><i className="fas fa-plus"></i> Novo Edifício</button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map(b => (
           <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col">
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
           </div>
        ))}
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-2xl text-slate-800">Novo Edifício</h3>
                      <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><i className="fas fa-times"></i></button>
                  </div>
                  
                  <form onSubmit={handleSave} className="space-y-5">
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Nome do Edifício / Local</label>
                        <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" placeholder="Ex: Galpão Norte" onChange={e=>setFormData({...formData, name:e.target.value})} />
                      </div>
                      
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Tipo de Instalação</label>
                        <select className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})}>
                            <option value="CORPORATE">Corporativo / Escritório</option>
                            <option value="INDUSTRIAL">Industrial / Fábrica</option>
                            <option value="LOGISTICS">Logístico / CD</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">Cidade</label>
                            <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, city:e.target.value})} />
                          </div>
                          <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">Gestor Local</label>
                            <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, manager:e.target.value})} />
                          </div>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Endereço Completo</label>
                        <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, address:e.target.value})} />
                      </div>
                      
                      <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Observações</label>
                        <textarea className="w-full p-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary h-24" onChange={e=>setFormData({...formData, notes:e.target.value})} />
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

export default BuildingManager;
