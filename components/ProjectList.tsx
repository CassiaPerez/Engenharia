
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
  const [modalTab, setModalTab] = useState<'DETAILS' | 'RESOURCES'>('DETAILS'); // Controle das Abas
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCostDetail, setShowCostDetail] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados auxiliares form
  const [tempMatId, setTempMatId] = useState('');
  const [tempMatQty, setTempMatQty] = useState('');
  const [tempMatCost, setTempMatCost] = useState('');
  const [matSearch, setMatSearch] = useState('');

  const [tempSrvId, setTempSrvId] = useState('');
  const [tempSrvHrs, setTempSrvHrs] = useState('');
  const [tempSrvCost, setTempSrvCost] = useState('');
  const [srvSearch, setSrvSearch] = useState('');

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
    setModalTab('DETAILS');
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
    setMatSearch(''); setSrvSearch('');
    setShowModal(true);
  };

  const openEditProjectModal = (p: Project) => {
    setEditingProject(p);
    setModalTab('DETAILS');
    setFormProject({
      ...p,
      location: p.location || '',
      city: p.city || '',
      detailedDescription: p.detailedDescription || ''
    });
    setMatSearch(''); setSrvSearch('');
    setShowModal(true);
  };

  const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mId = e.target.value;
    setTempMatId(mId);
    if (mId) {
        const mat = materials.find(m => m.id === mId);
        if (mat) setTempMatCost(mat.unitCost.toString());
    } else {
        setTempMatCost('');
    }
  };

  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setTempSrvId(sId);
    if (sId) {
        const srv = services.find(s => s.id === sId);
        if (srv) setTempSrvCost(srv.unitValue.toString());
    } else {
        setTempSrvCost('');
    }
  };

  const addPlannedMaterial = () => {
    if(!tempMatId || !tempMatQty || !tempMatCost) return;
    const current = formProject.plannedMaterials || [];
    const cost = Number(tempMatCost);
    const qty = Number(tempMatQty);

    const existingIndex = current.findIndex(m => m.materialId === tempMatId);
    
    let updatedMaterials;
    if(existingIndex >= 0) {
        updatedMaterials = [...current];
        updatedMaterials[existingIndex] = {
            ...updatedMaterials[existingIndex],
            quantity: updatedMaterials[existingIndex].quantity + qty,
            unitCost: cost
        };
    } else {
        updatedMaterials = [...current, { materialId: tempMatId, quantity: qty, unitCost: cost }];
    }
    
    setFormProject({ ...formProject, plannedMaterials: updatedMaterials });
    setTempMatId(''); setTempMatQty(''); setTempMatCost(''); setMatSearch('');
  };

  const removePlannedMaterial = (id: string) => {
      setFormProject({ ...formProject, plannedMaterials: (formProject.plannedMaterials || []).filter(m => m.materialId !== id) });
  };

  const addPlannedService = () => {
    if(!tempSrvId || !tempSrvHrs || !tempSrvCost) return;
    const current = formProject.plannedServices || [];
    const cost = Number(tempSrvCost);
    const hrs = Number(tempSrvHrs);

    const existingIndex = current.findIndex(s => s.serviceTypeId === tempSrvId);

    let updatedServices;
    if(existingIndex >= 0) {
        updatedServices = [...current];
        updatedServices[existingIndex] = {
            ...updatedServices[existingIndex],
            hours: updatedServices[existingIndex].hours + hrs,
            unitCost: cost
        };
    } else {
        updatedServices = [...current, { serviceTypeId: tempSrvId, hours: hrs, unitCost: cost }];
    }

    setFormProject({ ...formProject, plannedServices: updatedServices });
    setTempSrvId(''); setTempSrvHrs(''); setTempSrvCost(''); setSrvSearch('');
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

  const filteredMaterialsList = materials.filter(m => 
    m.description.toLowerCase().includes(matSearch.toLowerCase()) || 
    m.code.toLowerCase().includes(matSearch.toLowerCase())
  );

  const filteredServicesList = services.filter(s => 
    s.name.toLowerCase().includes(srvSearch.toLowerCase())
  );

  // --- PDF Logic ---
  const generateProjectDetailPDF = (project: Project) => {
    // ... existing implementation
    const doc = new jsPDF();
    const costs = calculateProjectCosts(project, oss, materials, services);
    doc.setFillColor(71, 122, 127); doc.rect(0, 0, 210, 20, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("FICHA TÉCNICA DE PROJETO (CAPEX)", 14, 13);
    doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    let yPos = 30; doc.text(`Código: ${project.code}`, 14, yPos); doc.text(`Status: ${project.status}`, 120, yPos); yPos += 6;
    doc.text(`Descrição:`, 14, yPos); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(project.description, 170), 35, yPos); yPos += 10;
    doc.save(`${project.code}_Detalhado.pdf`);
  };

  const exportToCSV = () => {
    const headers = ['Código', 'Descrição', 'Status', 'Cidade', 'Responsável', 'Budget (R$)', 'Realizado (R$)', 'Início', 'Fim Estimado'];
    const rows = filteredProjects.map(p => {
        const costs = calculateProjectCosts(p, oss, materials, services);
        return [
            p.code, `"${p.description}"`, p.status, p.city, p.responsible,
            p.estimatedValue.toFixed(2).replace('.', ','), costs.totalReal.toFixed(2).replace('.', ','),
            formatDate(p.startDate), formatDate(p.estimatedEndDate)
        ];
    });
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `projetos_export.csv`; link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    autoTable(doc, {
        head: [["Código", "Descrição", "Status", "Resp.", "Início", "Budget"]],
        body: filteredProjects.map(p => [p.code, p.description, p.status, p.responsible, formatDate(p.startDate), `R$ ${formatCurrency(p.estimatedValue)}`]),
    });
    doc.save(`projetos_export.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Portfólio de Projetos</h2>
          <p className="text-slate-600 text-lg mt-1 font-medium">Gerenciamento de Capex e Obras Industriais.</p>
        </div>
        <div className="flex flex-col xl:flex-row gap-3 w-full md:w-auto items-center">
            <div className="relative group w-full md:w-80">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-clean-primary transition-colors"></i>
                <input type="text" placeholder="Buscar por código ou nome..." className="w-full h-12 pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all placeholder:text-slate-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
                <button onClick={exportToCSV} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 h-12"><i className="fas fa-file-csv text-emerald-600 text-xl"></i></button>
                <button onClick={exportToPDF} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 h-12"><i className="fas fa-file-pdf text-red-600 text-xl"></i></button>
                <button onClick={openNewProjectModal} className="bg-clean-primary text-white px-6 py-3 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-clean-primary/90 transition-all shadow-lg shadow-clean-primary/20 flex items-center justify-center gap-2 whitespace-nowrap h-12"><i className="fas fa-plus"></i> Novo Projeto</button>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {filteredProjects.map(p => {
          const costs = calculateProjectCosts(p, oss, materials, services);
          const projectOSs = oss.filter(o => o.projectId === p.id);
          const budgetPercent = p.estimatedValue > 0 ? (costs.totalReal / p.estimatedValue) * 100 : 0;
          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row overflow-hidden hover:shadow-lg transition-all group">
              <div className={`w-3 ${budgetPercent > 100 ? 'bg-red-500' : 'bg-clean-primary'}`}></div>
              <div className="flex-1 p-8">
                 <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-sm font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-md border border-slate-300 font-mono">{p.code}</span>
                            <span className={`text-sm font-bold px-3 py-1 rounded-md border uppercase ${p.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{p.status}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{p.description}</h3>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEditProjectModal(p)} className="px-4 py-2.5 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-blue-700 hover:border-blue-400 bg-white hover:bg-blue-50 transition-all text-base font-bold shadow-sm"><i className="fas fa-pencil"></i> Editar</button>
                        <button onClick={() => setShowCostDetail(p)} className="px-4 py-2.5 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-clean-primary hover:border-clean-primary bg-white hover:bg-slate-50 transition-all text-base font-bold shadow-sm"><i className="fas fa-eye"></i> Detalhes</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-base items-end mt-6">
                    <div><p className="text-xs text-slate-500 uppercase font-black tracking-wider mb-1.5">Localização</p><p className="font-bold text-slate-800 truncate">{p.location || 'N/A'}</p></div>
                    <div><p className="text-xs text-slate-500 uppercase font-black tracking-wider mb-1.5">Gerente</p><p className="font-bold text-slate-800 truncate">{p.responsible}</p></div>
                    <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-end mb-1"><span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Consumo do Budget</span><span className={`text-base font-black ${budgetPercent > 100 ? 'text-red-700' : 'text-emerald-700'}`}>{budgetPercent.toFixed(0)}%</span></div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full transition-all duration-1000 ${budgetPercent > 100 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{width: `${Math.min(budgetPercent, 100)}%`}}></div></div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Real: R$ {formatCurrency(costs.totalReal)}</span><span>Plan: R$ {formatCurrency(p.estimatedValue)}</span></div>
                    </div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col animate-in zoom-in-95 fade-in duration-300 border border-slate-200 overflow-hidden max-h-[90vh]">
            
            {/* Header Fixo */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingProject ? 'Editar Projeto' : 'Novo Projeto de Capex'}</h3>
                    <p className="text-sm text-slate-500 mt-1">Preencha as informações técnicas e financeiras.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"><i className="fas fa-times"></i></button>
            </div>

            {/* Abas de Navegação */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-8 gap-6 shrink-0">
                <button 
                    onClick={() => setModalTab('DETAILS')}
                    className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === 'DETAILS' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${modalTab === 'DETAILS' ? 'bg-clean-primary text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
                    Detalhes do Projeto
                </button>
                <button 
                    onClick={() => setModalTab('RESOURCES')}
                    className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === 'RESOURCES' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${modalTab === 'RESOURCES' ? 'bg-clean-primary text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
                    Recursos e Custos
                </button>
            </div>
            
            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                <form id="projectForm" onSubmit={handleSave} className="space-y-8">
                    
                    {modalTab === 'DETAILS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Seção 1: Dados Gerais */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2"><i className="fas fa-info-circle text-slate-400"></i> Informações Básicas</h4>
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Título do Projeto</label>
                                        <input required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all focus:bg-white" placeholder="Ex: Ampliação da Linha C" value={formProject.description || ''} onChange={e => setFormProject({...formProject, description: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Escopo Detalhado</label>
                                        <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 h-28 custom-scrollbar transition-all focus:bg-white" placeholder="Descreva os detalhes técnicos..." value={formProject.detailedDescription || ''} onChange={e => setFormProject({...formProject, detailedDescription: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Seção 2: Localização e Responsabilidade */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2"><i className="fas fa-map-marker-alt text-slate-400"></i> Localização & Responsabilidade</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Local (Prédio/Setor)</label>
                                        <input className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all focus:bg-white" value={formProject.location || ''} onChange={e => setFormProject({...formProject, location: e.target.value})} placeholder="Ex: Galpão B" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cidade</label>
                                        <input className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all focus:bg-white" value={formProject.city || ''} onChange={e => setFormProject({...formProject, city: e.target.value})} placeholder="Ex: São Paulo" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Centro de Custo</label>
                                        <input className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all focus:bg-white" value={formProject.costCenter || ''} onChange={e => setFormProject({...formProject, costCenter: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Responsável</label>
                                        <input className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all focus:bg-white" value={formProject.responsible || ''} onChange={e => setFormProject({...formProject, responsible: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Seção 3: Financeiro Macro */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2"><i className="fas fa-sack-dollar text-slate-400"></i> Orçamento & Prazos</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Budget Aprovado (R$)</label>
                                        <input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all focus:bg-white" value={formProject.estimatedValue} onChange={e => setFormProject({...formProject, estimatedValue: Number(e.target.value)})} placeholder="0,00" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Prazo Estimado (Dias)</label>
                                        <input type="number" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all focus:bg-white" value={formProject.slaDays} onChange={e => setFormProject({...formProject, slaDays: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {modalTab === 'RESOURCES' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            
                            {/* Resumo de Planejamento */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Planejado</span>
                                    <p className="text-2xl font-black text-slate-800 mt-1">R$ {formatCurrency(plannedCosts.totalPlanned)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Budget</span>
                                    <p className="text-2xl font-black text-slate-800 mt-1">R$ {formatCurrency(formProject.estimatedValue || 0)}</p>
                                </div>
                                <div className={`p-4 rounded-xl border shadow-sm ${plannedCosts.totalPlanned > (formProject.estimatedValue || 0) ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <span className={`text-xs font-bold uppercase ${plannedCosts.totalPlanned > (formProject.estimatedValue || 0) ? 'text-red-600' : 'text-emerald-600'}`}>Saldo Projetado</span>
                                    <p className={`text-2xl font-black mt-1 ${plannedCosts.totalPlanned > (formProject.estimatedValue || 0) ? 'text-red-700' : 'text-emerald-700'}`}>
                                        R$ {formatCurrency((formProject.estimatedValue || 0) - plannedCosts.totalPlanned)}
                                    </p>
                                </div>
                            </div>

                            {/* MATERIAIS */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2"><i className="fas fa-cubes text-clean-primary"></i> Planejamento de Materiais</h4>
                                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-bold text-slate-600 border border-slate-200">Total: R$ {formatCurrency(plannedCosts.matCost)}</span>
                                </div>

                                {/* Add Bar */}
                                <div className="flex gap-3 mb-6 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex-1 relative">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Buscar Material</label>
                                        <input type="text" placeholder="Nome ou Código..." className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-clean-primary transition-all" value={matSearch} onChange={e => setMatSearch(e.target.value)} />
                                        <i className="fas fa-search absolute left-3 bottom-3 text-slate-400 text-xs"></i>
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Selecionar Item</label>
                                        <select className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm font-medium shadow-sm" value={tempMatId} onChange={handleMaterialSelect}>
                                            <option value="">Selecione ({filteredMaterialsList.length})...</option>
                                            {filteredMaterialsList.map(m => <option key={m.id} value={m.id}>{m.description}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Qtd</label>
                                        <input type="number" className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center" value={tempMatQty} onChange={e => setTempMatQty(e.target.value)} />
                                    </div>
                                    <div className="w-28">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Custo Unit.</label>
                                        <input type="number" step="0.01" className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center" value={tempMatCost} onChange={e => setTempMatCost(e.target.value)} />
                                    </div>
                                    <button type="button" onClick={addPlannedMaterial} className="h-10 w-10 flex items-center justify-center bg-slate-800 hover:bg-slate-900 rounded-lg text-white shadow-md transition-all"><i className="fas fa-plus text-xs"></i></button>
                                </div>

                                {/* Lista */}
                                <div className="border rounded-xl overflow-hidden border-slate-200">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3">Item</th>
                                                <th className="px-4 py-3 text-right">Qtd</th>
                                                <th className="px-4 py-3 text-right">Unitário</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                                <th className="px-4 py-3 text-center">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {formProject.plannedMaterials?.map((pm, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-700">{materials.find(m => m.id === pm.materialId)?.description}</td>
                                                    <td className="px-4 py-3 text-right font-bold">{pm.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-slate-500">R$ {formatCurrency(pm.unitCost)}</td>
                                                    <td className="px-4 py-3 text-right font-black text-slate-800">R$ {formatCurrency(pm.quantity * pm.unitCost)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button type="button" onClick={() => removePlannedMaterial(pm.materialId)} className="text-red-400 hover:text-red-600 transition-colors"><i className="fas fa-trash"></i></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!formProject.plannedMaterials || formProject.plannedMaterials.length === 0) && (
                                                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Nenhum material adicionado.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* SERVIÇOS */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2"><i className="fas fa-users-gear text-clean-primary"></i> Planejamento de Mão de Obra</h4>
                                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-bold text-slate-600 border border-slate-200">Total: R$ {formatCurrency(plannedCosts.srvCost)}</span>
                                </div>

                                {/* Add Bar */}
                                <div className="flex gap-3 mb-6 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex-1 relative">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Buscar Serviço</label>
                                        <input type="text" placeholder="Nome..." className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-clean-primary transition-all" value={srvSearch} onChange={e => setSrvSearch(e.target.value)} />
                                        <i className="fas fa-search absolute left-3 bottom-3 text-slate-400 text-xs"></i>
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Selecionar Tipo</label>
                                        <select className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm font-medium shadow-sm" value={tempSrvId} onChange={handleServiceSelect}>
                                            <option value="">Selecione ({filteredServicesList.length})...</option>
                                            {filteredServicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Horas</label>
                                        <input type="number" className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center" value={tempSrvHrs} onChange={e => setTempSrvHrs(e.target.value)} />
                                    </div>
                                    <div className="w-28">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Custo/Hora</label>
                                        <input type="number" step="0.01" className="w-full h-10 px-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center" value={tempSrvCost} onChange={e => setTempSrvCost(e.target.value)} />
                                    </div>
                                    <button type="button" onClick={addPlannedService} className="h-10 w-10 flex items-center justify-center bg-slate-800 hover:bg-slate-900 rounded-lg text-white shadow-md transition-all"><i className="fas fa-plus text-xs"></i></button>
                                </div>

                                {/* Lista */}
                                <div className="border rounded-xl overflow-hidden border-slate-200">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3">Serviço</th>
                                                <th className="px-4 py-3 text-right">Horas</th>
                                                <th className="px-4 py-3 text-right">Taxa (R$/h)</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                                <th className="px-4 py-3 text-center">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {formProject.plannedServices?.map((ps, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-700">{services.find(s => s.id === ps.serviceTypeId)?.name}</td>
                                                    <td className="px-4 py-3 text-right font-bold">{ps.hours} h</td>
                                                    <td className="px-4 py-3 text-right text-slate-500">R$ {formatCurrency(ps.unitCost)}</td>
                                                    <td className="px-4 py-3 text-right font-black text-slate-800">R$ {formatCurrency(ps.hours * ps.unitCost)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button type="button" onClick={() => removePlannedService(ps.serviceTypeId)} className="text-red-400 hover:text-red-600 transition-colors"><i className="fas fa-trash"></i></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!formProject.plannedServices || formProject.plannedServices.length === 0) && (
                                                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Nenhum serviço adicionado.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>
            
            {/* Footer Fixo */}
            <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-between items-center sticky bottom-0 z-10 shrink-0">
                <div className="text-xs text-slate-400 font-medium hidden sm:block">
                    {modalTab === 'DETAILS' ? 'Preencha os dados obrigatórios para continuar.' : 'Adicione itens para compor o custo planejado.'}
                </div>
                <div className="flex justify-end gap-3 w-full sm:w-auto">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button>
                    {modalTab === 'DETAILS' ? (
                        <button type="button" onClick={() => setModalTab('RESOURCES')} className="px-8 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 shadow-lg transition-all flex items-center gap-2">
                            Próximo: Recursos <i className="fas fa-arrow-right"></i>
                        </button>
                    ) : (
                        <button type="submit" form="projectForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transform hover:-translate-y-0.5 transition-all flex items-center gap-2">
                            <i className="fas fa-check"></i> Salvar Projeto
                        </button>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
      
      {showCostDetail && (
        // ... (Mantive o Modal de Detalhes Financeiros existente inalterado, apenas omitindo do snippet para brevidade se não houve mudança lógica nele)
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-300 overflow-hidden border border-slate-200">
             <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                   <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Detalhamento Financeiro</h3>
                   <p className="text-base text-slate-500 mt-1 font-medium flex items-center gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-600">{showCostDetail.code}</span>
                      {showCostDetail.description}
                   </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => generateProjectDetailPDF(showCostDetail)} className="bg-white text-slate-700 hover:text-clean-primary hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border border-slate-300 shadow-sm flex items-center gap-2">
                        <i className="fas fa-print"></i> PDF
                    </button>
                    <button onClick={() => setShowCostDetail(null)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200"><i className="fas fa-times text-lg"></i></button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                {/* FINANCIAL SUMMARY CARDS */}
                {(() => {
                    const costs = calculateProjectCosts(showCostDetail, oss, materials, services);
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Orçamento (Budget)</p>
                                <p className="text-3xl font-black text-slate-800 tracking-tight">R$ {formatCurrency(showCostDetail.estimatedValue)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-lg shadow-blue-500/5 relative overflow-hidden ring-1 ring-blue-50">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1">Custo Realizado</p>
                                <p className="text-3xl font-black text-blue-900 tracking-tight">R$ {formatCurrency(costs.totalReal)}</p>
                                <div className="flex gap-4 text-[10px] uppercase font-bold mt-3 pt-3 border-t border-blue-50">
                                    <span className="text-slate-400">Mat: <span className="text-slate-600">R$ {formatCurrency(costs.totalMaterials)}</span></span>
                                    <span className="text-slate-400">Srv: <span className="text-slate-600">R$ {formatCurrency(costs.totalServices)}</span></span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${costs.variance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Variação / Saldo</p>
                                <p className={`text-3xl font-black tracking-tight ${costs.variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {costs.variance >= 0 ? '+' : ''} R$ {formatCurrency(costs.variance)}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase">{costs.variancePercent.toFixed(1)}% do orçamento utilizado</p>
                            </div>
                        </div>
                    );
                })()}

                {/* Tabelas de comparativo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border border-slate-200 rounded-2xl p-6 shadow-sm bg-white">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-5 pb-3 flex items-center gap-2 border-b border-slate-100"><i className="fas fa-cubes text-clean-primary"></i> Materiais (Plan x Real)</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider"><th className="text-left pb-3">Item</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {showCostDetail.plannedMaterials.map(pm => {
                                    const actual = getActualMaterialQty(showCostDetail.id, pm.materialId);
                                    const mat = materials.find(m => m.id === pm.materialId);
                                    const diff = actual - pm.quantity;
                                    return (
                                        <tr key={pm.materialId} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-3 text-slate-700 font-bold group-hover:text-slate-900">{mat?.description}</td>
                                            <td className="text-right text-slate-500 font-medium">{pm.quantity}</td>
                                            <td className="text-right text-slate-800 font-bold">{actual}</td>
                                            <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${diff > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{diff > 0 ? `+${diff}` : diff}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="border border-slate-200 rounded-2xl p-6 shadow-sm bg-white">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-5 pb-3 flex items-center gap-2 border-b border-slate-100"><i className="fas fa-clock text-clean-primary"></i> Serviços (Horas)</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider"><th className="text-left pb-3">Tipo</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {showCostDetail.plannedServices.map(ps => {
                                    const actual = getActualServiceHours(showCostDetail.id, ps.serviceTypeId);
                                    const srv = services.find(s => s.id === ps.serviceTypeId);
                                    const diff = actual - ps.hours;
                                    return (
                                        <tr key={ps.serviceTypeId} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-3 text-slate-700 font-bold group-hover:text-slate-900">{srv?.name}</td>
                                            <td className="text-right text-slate-500 font-medium">{ps.hours}</td>
                                            <td className="text-right text-slate-800 font-bold">{actual}</td>
                                            <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${diff > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{diff > 0 ? `+${diff}` : diff}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
             
             <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end rounded-b-2xl">
                 <button onClick={() => setShowCostDetail(null)} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg hover:shadow-xl transform active:scale-95">Fechar Detalhes</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
