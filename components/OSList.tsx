
import React, { useState } from 'react';
import { OS, OSStatus, Project, Material, ServiceType } from '../types';
import { calculateOSCosts } from '../services/engine';

interface Props {
  oss: OS[];
  setOss: React.Dispatch<React.SetStateAction<OS[]>>;
  projects: Project[];
  materials: Material[];
  services: ServiceType[];
  onStockChange: (mId: string, qty: number, osNumber: string) => void;
}

const OSList: React.FC<Props> = ({ oss, setOss, projects, materials, services, onStockChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  const [formOS, setFormOS] = useState<Partial<OS>>({ priority: 'MEDIUM', status: OSStatus.OPEN, slaHours: 24 });

  const handleUpdateStatus = (osId: string, newStatus: OSStatus) => {
    setOss(prev => prev.map(o => o.id === osId ? { 
      ...o, 
      status: newStatus, 
      endTime: newStatus === OSStatus.COMPLETED ? new Date().toISOString() : o.endTime,
      startTime: newStatus === OSStatus.IN_PROGRESS && !o.startTime ? new Date().toISOString() : o.startTime
    } : o));
    if (selectedOS?.id === osId) {
      setSelectedOS(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOS.projectId) return;
    const os: OS = {
      id: Math.random().toString(36).substr(2, 9),
      number: `OS-${Date.now().toString().slice(-4)}`,
      projectId: formOS.projectId,
      description: formOS.description || '',
      type: formOS.type || (projects.find(p => p.id === formOS.projectId)?.reasonType as any),
      priority: formOS.priority as any,
      slaHours: Number(formOS.slaHours),
      openDate: new Date().toISOString(),
      limitDate: new Date(Date.now() + (Number(formOS.slaHours)) * 3600000).toISOString(),
      status: OSStatus.OPEN,
      materials: [],
      services: []
    };
    setOss([...oss, os]);
    setShowModal(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-clean-text">Ordens de Serviço</h2>
          <p className="text-clean-secondary text-sm mt-1">Gerenciamento de tarefas em tempo real.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-clean-primary text-white px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 shadow-sm transition-all"
        >
          Nova Requisição
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {oss.map(os => {
          const project = projects.find(p => p.id === os.projectId);
          const costs = calculateOSCosts(os, materials, services);
          const isDelayed = os.status !== OSStatus.COMPLETED && new Date(os.limitDate) < new Date();

          return (
            <div key={os.id} className="bg-white rounded-2xl border border-clean-border card-shadow transition-all card-shadow-hover p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[9px] font-bold text-clean-secondary bg-slate-50 px-2 py-1 rounded border border-clean-border uppercase">{os.number}</span>
                <span className={`text-[8px] font-bold px-2 py-1 rounded-full uppercase border ${
                  os.priority === 'CRITICAL' ? 'border-red-100 bg-red-50 text-red-600' : 'border-slate-100 bg-slate-50 text-slate-500'
                }`}>{os.priority}</span>
              </div>
              <h4 className="font-bold text-sm text-clean-text mb-4 line-clamp-2 min-h-[2.5rem]">{os.description}</h4>
              <p className="text-[10px] text-clean-secondary font-medium mb-6">{project?.code} • {project?.description}</p>
              
              <div className="border-t border-clean-border pt-4 mt-4 flex justify-between items-center">
                <div className="text-[10px] font-bold text-clean-text">R$ {costs.totalCost.toLocaleString('pt-BR')}</div>
                <button 
                  onClick={() => setSelectedOS(os)}
                  className="text-[10px] font-bold text-clean-primary hover:underline"
                >Gerenciar</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleCreate}>
              <div className="p-6 border-b border-clean-border flex justify-between items-center">
                <h3 className="font-bold text-clean-text">Nova OS</h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-500"><i className="fas fa-times"></i></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-clean-secondary uppercase mb-2 block">Projeto</label>
                  <select required className="w-full bg-slate-50 border border-clean-border rounded-lg p-2.5 text-xs outline-none" onChange={e => setFormOS({...formOS, projectId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.description}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-clean-secondary uppercase mb-2 block">Descrição</label>
                  <textarea required className="w-full bg-slate-50 border border-clean-border rounded-lg p-2.5 text-xs outline-none h-24" onChange={e => setFormOS({...formOS, description: e.target.value})} />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Sair</button>
                <button type="submit" className="bg-clean-primary text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OSList;
