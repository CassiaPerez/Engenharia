
import React, { useState } from 'react';
import { Project, OS, Material, ServiceType, ProjectStatus, Category, OSType, OSStatus } from '../types';
import { calculateProjectCosts, calculatePlannedCosts, formatDate } from '../services/engine';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [searchTerm, setSearchTerm] = useState('');

  // Estados auxiliares form
  const [tempMatId, setTempMatId] = useState('');
  const [tempMatQty, setTempMatQty] = useState('');
  const [tempSrvId, setTempSrvId] = useState('');
  const [tempSrvHrs, setTempSrvHrs] = useState('');

  const [formProject, setFormProject] = useState<Partial<Project>>({
    category: Category.ENGINEERING,
    status: ProjectStatus.PLANNED,
    slaDays: 30,
    startDate: new Date().toISOString().split('T')[0],
    plannedMaterials: [],
    plannedServices: [],
    location: '',
    city: '',
    detailedDescription: ''
  });

  const openNewProjectModal = () => {
    setEditingProject(null);
    setFormProject({
      category: Category.ENGINEERING,
      status: ProjectStatus.PLANNED,
      slaDays: 30,
      startDate: new Date().toISOString().split('T')[0],
      estimatedValue: 0,
      plannedMaterials: [],
      plannedServices: [],
      location: '',
      city: '',
      detailedDescription: '',
      description: '',
      responsible: '',
      costCenter: '',
      area: ''
    });
    setShowModal(true);
  };

  const openEditProjectModal = (p: Project) => {
    setEditingProject(p);
    setFormProject({
      ...p,
      location: p.location || '',
      city: p.city || '',
      detailedDescription: p.detailedDescription || ''
    });
    setShowModal(true);
  };

  const addPlannedMaterial = () => {
    if(!tempMatId || !tempMatQty) return;
    const current = formProject.plannedMaterials || [];
    const existing = current.find(m => m.materialId === tempMatId);
    if(existing) {
        setFormProject({ ...formProject, plannedMaterials: current.map(m => m.materialId === tempMatId ? { ...m, quantity: m.quantity + Number(tempMatQty) } : m) });
    } else {
        setFormProject({ ...formProject, plannedMaterials: [...current, { materialId: tempMatId, quantity: Number(tempMatQty) }] });
    }
    setTempMatId(''); setTempMatQty('');
  };

  const removePlannedMaterial = (id: string) => {
      setFormProject({ ...formProject, plannedMaterials: (formProject.plannedMaterials || []).filter(m => m.materialId !== id) });
  };

  const addPlannedService = () => {
    if(!tempSrvId || !tempSrvHrs) return;
    const current = formProject.plannedServices || [];
    const existing = current.find(s => s.serviceTypeId === tempSrvId);
    if(existing) {
        setFormProject({ ...formProject, plannedServices: current.map(s => s.serviceTypeId === tempSrvId ? { ...s, hours: s.hours + Number(tempSrvHrs) } : s) });
    } else {
        setFormProject({ ...formProject, plannedServices: [...current, { serviceTypeId: tempSrvId, hours: Number(tempSrvHrs) }] });
    }
    setTempSrvId(''); setTempSrvHrs('');
  };

  const removePlannedService = (id: string) => {
      setFormProject({ ...formProject, plannedServices: (formProject.plannedServices || []).filter(s => s.serviceTypeId !== id) });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = formProject.startDate || '';
    const slaDays = Number(formProject.slaDays) || 30;
    const limitDate = new Date(startDate);
    limitDate.setDate(limitDate.getDate() + slaDays);

    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? { 
        ...p, ...formProject, estimatedEndDate: limitDate.toISOString().split('T')[0],
        auditLogs: [...p.auditLogs, { date: new Date().toISOString(), action: 'Alteração de Escopo', user: 'ADMIN' }]
      } as Project : p));
    } else {
      const project: Project = {
        id: Math.random().toString(36).substr(2, 9),
        code: `PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        description: formProject.description || '',
        detailedDescription: formProject.detailedDescription || '',
        location: formProject.location || '',
        city: formProject.city || '',
        category: formProject.category as Category,
        reason: formProject.reason || '',
        reasonType: OSType.PREVENTIVE,
        responsible: formProject.responsible || '',
        area: formProject.area || '',
        costCenter: formProject.costCenter || '',
        estimatedValue: Number(formProject.estimatedValue) || 0,
        plannedMaterials: formProject.plannedMaterials || [],
        plannedServices: formProject.plannedServices || [],
        startDate: startDate,
        estimatedEndDate: limitDate.toISOString().split('T')[0],
        slaDays: slaDays,
        status: ProjectStatus.PLANNED,
        postponementHistory: [],
        auditLogs: [{ date: new Date().toISOString(), action: 'Criação', user: 'ADMIN' }]
      };
      setProjects([...projects, project]);
    }
    setShowModal(false); setEditingProject(null);
  };

  const getActualMaterialQty = (projectId: string, materialId: string) => oss.filter(o => o.projectId === projectId && o.status !== OSStatus.CANCELED).reduce((acc, o) => acc + (o.materials.find(m => m.materialId === materialId)?.quantity || 0), 0);
  const getActualServiceHours = (projectId: string, serviceId: string) => oss.filter(o => o.projectId === projectId && o.status !== OSStatus.CANCELED).reduce((acc, o) => acc + (o.services.find(s => s.serviceTypeId === serviceId)?.quantity || 0), 0);
  
  const plannedCosts = calculatePlannedCosts(formProject, materials, services);

  // Helper para formatar moeda
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filteredProjects = projects.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Funcionalidade de Exportação
  const exportToCSV = () => {
    const headers = ['Código', 'Descrição', 'Status', 'Cidade', 'Responsável', 'Budget (R$)', 'Realizado (R$)', 'Início', 'Fim Estimado'];
    const rows = filteredProjects.map(p => {
        const costs = calculateProjectCosts(p, oss, materials, services);
        return [
            p.code,
            `"${p.description}"`, // Escape para descrições com vírgula
            p.status,
            p.city,
            p.responsible,
            p.estimatedValue.toFixed(2).replace('.', ','),
            costs.totalReal.toFixed(2).replace('.', ','),
            formatDate(p.startDate),
            formatDate(p.estimatedEndDate)
        ];
    });

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projetos_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("Relatório de Projetos - Crop Service", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableColumn = ["Código", "Descrição", "Status", "Resp.", "Início", "Fim", "Budget", "Realizado"];
    const tableRows = filteredProjects.map(p => {
        const costs = calculateProjectCosts(p, oss, materials, services);
        return [
            p.code,
            p.description,
            p.status,
            p.responsible,
            formatDate(p.startDate),
            formatDate(p.estimatedEndDate),
            `R$ ${formatCurrency(p.estimatedValue)}`,
            `R$ ${formatCurrency(costs.totalReal)}`
        ];
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 122, 127] } // clean-primary color approx
    });

    doc.save(`projetos_export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Portfólio de Projetos</h2>
          <p className="text-slate-600 text-base mt-1 font-medium">Gerenciamento de Capex e Obras Industriais.</p>
        </div>
        <div className="flex flex-col xl:flex-row gap-3 w-full md:w-auto items-center">
            <div className="relative group w-full md:w-64">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-clean-primary transition-colors"></i>
                <input 
                    type="text" 
                    placeholder="Buscar por código ou nome..." 
                    className="w-full h-11 pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <button onClick={exportToCSV} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 h-11" title="Exportar CSV">
                    <i className="fas fa-file-csv text-emerald-600"></i>
                </button>
                <button onClick={exportToPDF} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 h-11" title="Exportar PDF">
                    <i className="fas fa-file-pdf text-red-600"></i>
                </button>
                <button onClick={openNewProjectModal} className="bg-clean-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-clean-primary/90 transition-all shadow-lg shadow-clean-primary/20 flex items-center justify-center gap-2 whitespace-nowrap h-11">
                    <i className="fas fa-plus"></i> Novo Projeto
                </button>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {filteredProjects.map(p => {
          const costs = calculateProjectCosts(p, oss, materials, services);
          const projectOSs = oss.filter(o => o.projectId === p.id);
          
          // Definição de Totais e Filtragem
          // Total de OSs inclui todas (Abertas, Pausadas, Concluídas, Canceladas) para visão global de volume
          const totalOSs = projectOSs.length;
          const activeOSs = projectOSs.filter(o => o.status !== OSStatus.CANCELED);
          const delayedOSCount = activeOSs.filter(o => o.status !== OSStatus.COMPLETED && new Date(o.limitDate) < new Date()).length;
          
          // Cálculo Financeiro
          const budgetPercent = p.estimatedValue > 0 ? (costs.totalReal / p.estimatedValue) * 100 : 0;
          
          // Cálculo Físico: (OSs Concluídas / Total de OSs vinculadas ao projeto) * 100
          const completedOSs = projectOSs.filter(o => o.status === OSStatus.COMPLETED).length;
          const executionPercent = totalOSs > 0 ? (completedOSs / totalOSs) * 100 : 0;

          const today = new Date();
          const diffDays = Math.ceil((new Date(p.estimatedEndDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row overflow-hidden hover:shadow-lg transition-all group">
              <div className={`w-3 ${budgetPercent > 100 ? 'bg-red-500' : 'bg-clean-primary'}`}></div>
              <div className="flex-1 p-8">
                 <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-md border border-slate-300 font-mono">{p.code}</span>
                            <span className={`text-xs font-bold px-3 py-1 rounded-md border uppercase ${p.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{p.status}</span>
                            {p.city && <span className="text-xs font-bold bg-white text-slate-700 px-2 py-1 rounded-md border border-slate-300 flex items-center gap-1"><i className="fas fa-map-marker-alt text-clean-primary"></i> {p.city}</span>}
                            {delayedOSCount > 0 && <span className="text-xs font-bold bg-red-50 text-red-700 px-3 py-1 rounded-md border border-red-300 flex items-center gap-2"><i className="fas fa-warning"></i> {delayedOSCount} Atrasos</span>}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2">{p.description}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2 font-medium">{p.detailedDescription || 'Sem descrição detalhada.'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEditProjectModal(p)} className="px-3 py-2 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-blue-700 hover:border-blue-400 bg-white hover:bg-blue-50 transition-all text-sm font-bold shadow-sm">
                            <i className="fas fa-pencil"></i> <span className="hidden xl:inline">Editar</span>
                        </button>
                        <button onClick={() => setShowCostDetail(p)} className="px-3 py-2 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-clean-primary hover:border-clean-primary bg-white hover:bg-slate-50 transition-all text-sm font-bold shadow-sm">
                            <i className="fas fa-eye"></i> <span className="hidden xl:inline">Detalhes</span>
                        </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 text-base items-end mt-6">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-black tracking-wider mb-1.5">Localização</p>
                        <p className="font-bold text-slate-800 truncate" title={p.location}>{p.location || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-black tracking-wider mb-1.5">Gerente</p>
                        <p className="font-bold text-slate-800 truncate" title={p.responsible}>{p.responsible}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-black tracking-wider mb-1.5">Prazo</p>
                        <p className={`font-bold ${diffDays < 0 ? 'text-red-700' : 'text-slate-800'}`}>{diffDays < 0 ? `Atrasado ${Math.abs(diffDays)}d` : `${diffDays} dias`}</p>
                    </div>
                    
                    {/* Barra de Progresso Físico */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Execução <span className="font-medium opacity-80 ml-1">({completedOSs}/{totalOSs})</span></span>
                            <span className="text-sm font-black text-blue-800">{executionPercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{width: `${executionPercent}%`}}></div>
                        </div>
                    </div>

                    {/* Barra de Progresso Financeiro */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Financeiro</span>
                            <span className={`text-sm font-black ${budgetPercent > 100 ? 'text-red-700' : 'text-emerald-700'}`}>{budgetPercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full transition-all duration-1000 ${budgetPercent > 100 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{width: `${Math.min(budgetPercent, 100)}%`}}></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                             <span>Real: R$ {formatCurrency(costs.totalReal)}</span>
                             <span>Budget: R$ {formatCurrency(p.estimatedValue)}</span>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCostDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div>
                   <h3 className="text-xl font-bold text-slate-900">Detalhamento Físico-Financeiro</h3>
                   <p className="text-base text-slate-600 mt-1 font-medium">{showCostDetail.code} - {showCostDetail.description}</p>
                </div>
                <button onClick={() => setShowCostDetail(null)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times text-xl"></i></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Tabelas de comparativo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-900 uppercase mb-5 border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-cubes text-slate-500"></i> Materiais (Plan x Real)</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-500 font-bold uppercase text-xs"><th className="text-left pb-3">Item</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {showCostDetail.plannedMaterials.map(pm => {
                                    const actual = getActualMaterialQty(showCostDetail.id, pm.materialId);
                                    const mat = materials.find(m => m.id === pm.materialId);
                                    const diff = actual - pm.quantity;
                                    return (
                                        <tr key={pm.materialId}>
                                            <td className="py-3 text-slate-800 font-bold">{mat?.description}</td>
                                            <td className="text-right text-slate-600 font-medium">{pm.quantity}</td>
                                            <td className="text-right text-slate-900 font-bold">{actual}</td>
                                            <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${diff > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>{diff > 0 ? `+${diff}` : diff}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-900 uppercase mb-5 border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-clock text-slate-500"></i> Serviços (Horas)</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-500 font-bold uppercase text-xs"><th className="text-left pb-3">Tipo</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {showCostDetail.plannedServices.map(ps => {
                                    const actual = getActualServiceHours(showCostDetail.id, ps.serviceTypeId);
                                    const srv = services.find(s => s.id === ps.serviceTypeId);
                                    const diff = actual - ps.hours;
                                    return (
                                        <tr key={ps.serviceTypeId}>
                                            <td className="py-3 text-slate-800 font-bold">{srv?.name}</td>
                                            <td className="text-right text-slate-600 font-medium">{ps.hours}</td>
                                            <td className="text-right text-slate-900 font-bold">{actual}</td>
                                            <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${diff > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>{diff > 0 ? `+${diff}` : diff}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="text-2xl font-bold text-slate-900">{editingProject ? 'Editar Projeto' : 'Novo Projeto de Capex'}</h3>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times text-lg"></i></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-info-circle text-clean-primary"></i> Dados Cadastrais</h4>
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Título do Projeto</label>
                            <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all placeholder:text-slate-400 font-medium" placeholder="Ex: Ampliação da Linha C" value={formProject.description || ''} onChange={e => setFormProject({...formProject, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Escopo Detalhado</label>
                            <textarea className="w-full p-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 h-24 custom-scrollbar font-medium" placeholder="Descreva os detalhes técnicos..." value={formProject.detailedDescription || ''} onChange={e => setFormProject({...formProject, detailedDescription: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-bold text-slate-800 mb-2 block">Local (Prédio/Setor)</label>
                                <input className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 font-medium" value={formProject.location || ''} onChange={e => setFormProject({...formProject, location: e.target.value})} placeholder="Ex: Galpão B" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-800 mb-2 block">Cidade</label>
                                <input className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 font-medium" value={formProject.city || ''} onChange={e => setFormProject({...formProject, city: e.target.value})} placeholder="Ex: São Paulo" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-bold text-slate-800 mb-2 block">Budget Aprovado (R$)</label>
                                <input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 font-medium" value={formProject.estimatedValue} onChange={e => setFormProject({...formProject, estimatedValue: Number(e.target.value)})} placeholder="0,00" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-800 mb-2 block">Prazo (Dias)</label>
                                <input type="number" required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 font-medium" value={formProject.slaDays} onChange={e => setFormProject({...formProject, slaDays: Number(e.target.value)})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-bold text-slate-800 mb-2 block">Centro de Custo</label>
                                <input className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 font-medium" value={formProject.costCenter || ''} onChange={e => setFormProject({...formProject, costCenter: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-800 mb-2 block">Responsável</label>
                                <input className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 font-medium" value={formProject.responsible || ''} onChange={e => setFormProject({...formProject, responsible: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-list-check text-clean-primary"></i> Planejamento de Recursos</h4>
                        
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                             <div className="flex justify-between text-sm mb-3 font-bold text-slate-800"><span>Materiais</span> <span className="text-clean-primary">Total: R$ {formatCurrency(plannedCosts.matCost)}</span></div>
                             <div className="flex gap-3 mb-4">
                                <select className="flex-1 h-11 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium shadow-sm" value={tempMatId} onChange={e => setTempMatId(e.target.value)}>
                                    <option value="">Selecione Material...</option>
                                    {materials.map(m => <option key={m.id} value={m.id}>{m.description}</option>)}
                                </select>
                                <input type="number" className="w-20 h-11 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium shadow-sm" placeholder="Qtd" value={tempMatQty} onChange={e => setTempMatQty(e.target.value)} />
                                <button type="button" onClick={addPlannedMaterial} className="h-11 px-4 bg-slate-800 hover:bg-slate-900 rounded-lg text-white shadow-sm transition-colors"><i className="fas fa-plus"></i></button>
                             </div>
                             <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {formProject.plannedMaterials?.map((pm, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                                        <span className="truncate flex-1 font-bold text-slate-800">{materials.find(m => m.id === pm.materialId)?.description}</span>
                                        <span className="font-bold mx-3 bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">{pm.quantity} un</span>
                                        <button type="button" onClick={() => removePlannedMaterial(pm.materialId)} className="text-red-500 hover:text-red-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"><i className="fas fa-trash"></i></button>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                             <div className="flex justify-between text-sm mb-3 font-bold text-slate-800"><span>Serviços (HH)</span> <span className="text-clean-primary">Total: R$ {formatCurrency(plannedCosts.srvCost)}</span></div>
                             <div className="flex gap-3 mb-4">
                                <select className="flex-1 h-11 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium shadow-sm" value={tempSrvId} onChange={e => setTempSrvId(e.target.value)}>
                                    <option value="">Selecione Serviço...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <input type="number" className="w-20 h-11 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-medium shadow-sm" placeholder="Hrs" value={tempSrvHrs} onChange={e => setTempSrvHrs(e.target.value)} />
                                <button type="button" onClick={addPlannedService} className="h-11 px-4 bg-slate-800 hover:bg-slate-900 rounded-lg text-white shadow-sm transition-colors"><i className="fas fa-plus"></i></button>
                             </div>
                             <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {formProject.plannedServices?.map((ps, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                                        <span className="truncate flex-1 font-bold text-slate-800">{services.find(s => s.id === ps.serviceTypeId)?.name}</span>
                                        <span className="font-bold mx-3 bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">{ps.hours} h</span>
                                        <button type="button" onClick={() => removePlannedService(ps.serviceTypeId)} className="text-red-500 hover:text-red-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"><i className="fas fa-trash"></i></button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-4 rounded-b-2xl">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-base font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-3 text-base font-bold text-white bg-clean-primary hover:bg-clean-primary/90 rounded-lg shadow-lg shadow-clean-primary/30 transition-all transform hover:-translate-y-0.5">Confirmar Projeto</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
