
import React, { useState } from 'react';
import { Project, OS, Material, ServiceType, ProjectStatus, Category, OSType, OSStatus } from '../types';
import { calculateProjectCosts, calculateOSCosts, formatDate } from '../services/engine';

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  oss: OS[];
  materials: Material[];
  services: ServiceType[];
}

const ProjectList: React.FC<Props> = ({ projects, setProjects, oss, materials, services }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCostDetail, setShowCostDetail] = useState<Project | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState<Project | null>(null);
  const [justification, setJustification] = useState('');
  const [newDate, setNewDate] = useState('');

  const [formProject, setFormProject] = useState<Partial<Project>>({
    category: Category.ENGINEERING,
    status: ProjectStatus.PLANNED,
    slaDays: 30,
    startDate: new Date().toISOString().split('T')[0],
    area: '',
    costCenter: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = formProject.startDate || '';
    const slaDays = Number(formProject.slaDays) || 30;
    const limitDate = new Date(startDate);
    limitDate.setDate(limitDate.getDate() + slaDays);

    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? { 
        ...p, 
        ...formProject,
        estimatedEndDate: limitDate.toISOString().split('T')[0],
        auditLogs: [...p.auditLogs, { date: new Date().toISOString(), action: 'Alteração de Escopo', user: 'ADMIN' }]
      } as Project : p));
    } else {
      const project: Project = {
        id: Math.random().toString(36).substr(2, 9),
        code: `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        description: formProject.description || '',
        category: formProject.category as Category,
        reason: formProject.reason || '',
        reasonType: OSType.PREVENTIVE,
        responsible: formProject.responsible || '',
        area: formProject.area || '',
        costCenter: formProject.costCenter || '',
        estimatedValue: Number(formProject.estimatedValue) || 0,
        startDate: startDate,
        estimatedEndDate: limitDate.toISOString().split('T')[0],
        slaDays: slaDays,
        status: ProjectStatus.PLANNED,
        postponementHistory: [],
        auditLogs: [{ date: new Date().toISOString(), action: 'Criação de Projeto', user: 'ADMIN' }]
      };
      setProjects([...projects, project]);
    }
    setShowModal(false);
    setEditingProject(null);
  };

  const handlePostpone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPostponeModal || !justification || !newDate) return;
    setProjects(prev => prev.map(p => p.id === showPostponeModal.id ? {
      ...p,
      estimatedEndDate: newDate,
      postponementHistory: [...p.postponementHistory, { date: new Date().toISOString(), justification, user: 'ADMIN' }],
      auditLogs: [...p.auditLogs, { date: new Date().toISOString(), action: `Prorrogação para ${formatDate(newDate)}`, user: 'ADMIN' }]
    } : p));
    setShowPostponeModal(null);
    setJustification('');
    setNewDate('');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-clean-text">Engenharia Corporativa</h2>
          <p className="text-clean-secondary text-sm mt-1">Gestão industrial de investimentos e cronogramas críticos.</p>
        </div>
        <button 
          onClick={() => { setEditingProject(null); setShowModal(true); }}
          className="bg-clean-primary text-white px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 shadow-sm transition-all"
        >
          <i className="fas fa-plus"></i> Novo Investimento
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {projects.map(p => {
          const costs = calculateProjectCosts(p, oss, materials, services);
          const projectOSs = oss.filter(o => o.projectId === p.id);
          const budgetPercent = p.estimatedValue > 0 ? (costs.totalReal / p.estimatedValue) * 100 : 0;
          const today = new Date();
          const limit = new Date(p.estimatedEndDate);
          const diffDays = Math.ceil((limit.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const slaColor = diffDays < 0 ? 'bg-red-500' : diffDays < 15 ? 'bg-amber-500' : 'bg-emerald-500';

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-clean-border card-shadow overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-lg group">
              <div className="flex-1 p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 bg-slate-900 text-white rounded-md">{p.code}</span>
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-md ${
                      p.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>{p.status}</span>
                  </div>
                  <button onClick={() => { setEditingProject(p); setFormProject(p); setShowModal(true); }} className="text-slate-300 hover:text-blue-600 transition-colors"><i className="fas fa-edit"></i></button>
                </div>

                <h3 className="text-2xl font-display font-bold text-clean-text mb-6 group-hover:text-clean-primary transition-colors leading-tight">{p.description}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Centro Custo</p>
                        <p className="font-bold text-slate-800 text-xs">{p.costCenter || '---'}</p>
                      </div>
                      <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Área</p>
                        <p className="font-bold text-slate-800 text-xs">{p.area || '---'}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">SLA Prazo</p>
                        <p className={`text-[10px] font-bold ${diffDays < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                          {diffDays < 0 ? `Atrasado` : `${diffDays} dias`}
                        </p>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: "100%" }} className={`h-full ${slaColor}`}></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-around items-center">
                    <div className="text-center">
                      <p className="text-xl font-display font-bold text-clean-text">{projectOSs.length}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">OS Totais</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-xl font-display font-bold text-emerald-600">{projectOSs.filter(o => o.status === OSStatus.COMPLETED).length}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">OS Concluídas</p>
                    </div>
                  </div>
                </div>
              </div>

              <div 
                className="lg:w-[320px] bg-slate-900 text-white p-8 flex flex-col justify-between cursor-pointer group/cost hover:bg-slate-800 transition-colors"
                onClick={() => setShowCostDetail(p)}
              >
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-6">Investimento Realizado</p>
                  <p className={`text-3xl font-display font-bold tracking-tighter ${budgetPercent > 100 ? 'text-red-400' : 'text-white'}`}>
                    R$ {costs.totalReal.toLocaleString('pt-BR')}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${budgetPercent > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(budgetPercent, 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold">{budgetPercent.toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="mt-8 flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowPostponeModal(p); }}
                    className="flex-1 py-2 border border-white/10 rounded-lg text-[9px] font-bold uppercase hover:bg-white/5 transition-all"
                  >Prorrogar</button>
                  <button className="flex-1 py-2 bg-blue-600 rounded-lg text-[9px] font-bold uppercase hover:bg-blue-500 transition-all">Detalhes</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detalhado de Custos Industrial */}
      {showCostDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-clean-border flex justify-between items-center sticky top-0 bg-white z-10">
               <div>
                  <h3 className="text-xl font-display font-bold text-clean-text">Auditoria Financeira de Projeto</h3>
                  <p className="text-clean-secondary text-xs mt-1">{showCostDetail.code} — {showCostDetail.description}</p>
               </div>
               <button onClick={() => setShowCostDetail(null)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:text-clean-text flex items-center justify-center transition-all">
                  <i className="fas fa-times"></i>
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
               {/* Sumário */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-slate-50 p-5 rounded-2xl border border-clean-border">
                   <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Target Orçado</p>
                   <p className="text-lg font-display font-bold text-clean-text">R$ {showCostDetail.estimatedValue.toLocaleString('pt-BR')}</p>
                 </div>
                 <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                   <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Total Executado</p>
                   <p className="text-lg font-display font-bold text-clean-primary">R$ {calculateProjectCosts(showCostDetail, oss, materials, services).totalReal.toLocaleString('pt-BR')}</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-clean-border">
                   <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Saldo Remanescente</p>
                   <p className={`text-lg font-display font-bold ${calculateProjectCosts(showCostDetail, oss, materials, services).variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                     R$ {calculateProjectCosts(showCostDetail, oss, materials, services).variance.toLocaleString('pt-BR')}
                   </p>
                 </div>
               </div>

               {/* Detalhamento por OS */}
               <div className="space-y-4">
                 <h4 className="text-[10px] font-bold text-clean-text uppercase tracking-widest flex items-center gap-2">
                   <i className="fas fa-list-check text-blue-500"></i> Detalhamento por Ordem de Serviço
                 </h4>
                 <div className="border border-clean-border rounded-2xl overflow-hidden">
                   <table className="w-full text-left text-xs">
                     <thead className="bg-slate-50 border-b border-clean-border font-bold text-clean-secondary">
                       <tr>
                         <th className="px-6 py-4">OS ID</th>
                         <th className="px-6 py-4">Descrição do Serviço</th>
                         <th className="px-6 py-4 text-center">Status</th>
                         <th className="px-6 py-4 text-right">Insumos</th>
                         <th className="px-6 py-4 text-right">Serviços</th>
                         <th className="px-6 py-4 text-right bg-slate-100/50">Total OS</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-clean-border">
                       {oss.filter(o => o.projectId === showCostDetail.id).map(os => {
                         const osCosts = calculateOSCosts(os, materials, services);
                         return (
                           <tr key={os.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-6 py-4 font-bold text-clean-primary">{os.number}</td>
                             <td className="px-6 py-4 text-clean-secondary line-clamp-1 max-w-[200px]">{os.description}</td>
                             <td className="px-6 py-4 text-center">
                               <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                 os.status === OSStatus.COMPLETED ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                               }`}>{os.status}</span>
                             </td>
                             <td className="px-6 py-4 text-right text-slate-500">R$ {osCosts.materialCost.toLocaleString('pt-BR')}</td>
                             <td className="px-6 py-4 text-right text-slate-500">R$ {osCosts.serviceCost.toLocaleString('pt-BR')}</td>
                             <td className="px-6 py-4 text-right font-bold text-clean-text bg-slate-50/30">R$ {osCosts.totalCost.toLocaleString('pt-BR')}</td>
                           </tr>
                         );
                       })}
                       {oss.filter(o => o.projectId === showCostDetail.id).length === 0 && (
                         <tr>
                           <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma OS vinculada a este projeto até o momento.</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>

               {/* Auditoria Logs */}
               <div className="space-y-4 pt-4 border-t border-clean-border">
                 <h4 className="text-[10px] font-bold text-clean-text uppercase tracking-widest">Logs de Governança</h4>
                 <div className="space-y-2">
                   {showCostDetail.auditLogs.map((log, i) => (
                     <div key={i} className="flex justify-between items-center text-[10px] p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <span className="font-bold text-slate-400">{new Date(log.date).toLocaleString('pt-BR')}</span>
                       <span className="font-bold text-clean-primary">{log.user}</span>
                       <span className="text-clean-secondary italic">{log.action}</span>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
            
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Comprometimento Total</p>
                <p className="text-2xl font-display font-bold">R$ {calculateProjectCosts(showCostDetail, oss, materials, services).totalReal.toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2">
                <i className="fas fa-file-export"></i> Exportar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outros Modais (Cadastro e Prorrogação) mantidos conforme estrutura original */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <form onSubmit={handleSave}>
              <div className="p-6 border-b border-clean-border flex justify-between items-center">
                <h3 className="font-bold text-clean-text">Definição de Escopo Capex</h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-500"><i className="fas fa-times"></i></button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-clean-secondary uppercase mb-2 block">Descrição</label>
                  <input type="text" required value={formProject.description || ''} onChange={e => setFormProject({...formProject, description: e.target.value})} className="w-full bg-slate-50 border border-clean-border rounded-lg p-2.5 text-xs outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-clean-secondary uppercase mb-2 block">Investimento (R$)</label>
                  <input type="number" required value={formProject.estimatedValue || 0} onChange={e => setFormProject({...formProject, estimatedValue: Number(e.target.value)})} className="w-full bg-slate-50 border border-clean-border rounded-lg p-2.5 text-xs outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-clean-secondary uppercase mb-2 block">SLA (Dias)</label>
                  <input type="number" required value={formProject.slaDays || 30} onChange={e => setFormProject({...formProject, slaDays: Number(e.target.value)})} className="w-full bg-slate-50 border border-clean-border rounded-lg p-2.5 text-xs outline-none focus:bg-white" />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Descartar</button>
                <button type="submit" className="bg-clean-primary text-white px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:brightness-110">Salvar Cronograma</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPostponeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[120]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <form onSubmit={handlePostpone} className="p-8 space-y-6">
              <h3 className="text-lg font-display font-bold text-clean-text">Prorrogação de Governança</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Novo Deadline</label>
                  <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-slate-50 border border-clean-border rounded-lg p-2.5 text-xs outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Justificativa</label>
                  <textarea required value={justification} onChange={e => setJustification(e.target.value)} className="w-full bg-slate-50 border border-clean-border rounded-lg p-2.5 text-xs outline-none h-32" placeholder="Descreva o motivo técnico..." />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPostponeModal(null)} className="flex-1 py-3 text-[10px] font-bold text-slate-400 uppercase hover:bg-slate-50 rounded-lg">Voltar</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase shadow-lg shadow-red-100">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
