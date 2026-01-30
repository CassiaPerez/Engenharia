
import React, { useState, useMemo } from 'react';
import { Project, OS, Material, ServiceType, ProjectStatus, Category, OSType, OSStatus, User } from '../types';
import { calculateProjectCosts, calculatePlannedCosts, formatDate } from '../services/engine';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../services/supabase';

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  oss: OS[];
  materials: Material[];
  setMaterials?: React.Dispatch<React.SetStateAction<Material[]>>; // Nova prop
  services: ServiceType[];
  currentUser: User;
}

const ProjectList: React.FC<Props> = ({ projects, setProjects, oss, materials, setMaterials, services, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'DETAILS' | 'RESOURCES'>('DETAILS'); 
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCostDetail, setShowCostDetail] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // States auxiliares para adição de recursos no formulário
  const [resMatId, setResMatId] = useState('');
  const [resMatQty, setResMatQty] = useState('');
  const [resMatFilter, setResMatFilter] = useState(''); // Filtro de busca de materiais
  
  const [resSrvId, setResSrvId] = useState('');
  const [resSrvHrs, setResSrvHrs] = useState('');
  const [resSrvFilter, setResSrvFilter] = useState(''); // Filtro de busca de serviços

  // Estado para criação rápida de material
  const [showQuickMatModal, setShowQuickMatModal] = useState(false);
  const [quickMat, setQuickMat] = useState({ description: '', unit: 'Un', cost: '' });

  const [formProject, setFormProject] = useState<Partial<Project>>({
    category: Category.ENGINEERING,
    status: ProjectStatus.PLANNED,
    slaDays: 30,
    startDate: new Date().toISOString().split('T')[0],
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

  const handleDelete = async (id: string) => {
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem excluir projetos.');
          return;
      }
      
      if (confirm('Tem certeza que deseja excluir este projeto?')) {
          const previousProjects = [...projects];
          setProjects(prev => prev.filter(p => p.id !== id));
          
          try {
              const { error } = await supabase.from('projects').delete().eq('id', id);
              if (error) throw error;
          } catch (e: any) {
              console.error('Erro ao excluir projeto:', e);
              setProjects(previousProjects);
              alert(`FALHA AO EXCLUIR:\n${e.message || JSON.stringify(e)}\n\nSOLUÇÃO: Vá em "Sistema > Documentação", copie o novo script "Correção de Permissões" e execute no Supabase.`);
          }
      }
  };

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
    setResMatId(''); setResMatQty(''); setResMatFilter('');
    setResSrvId(''); setResSrvHrs(''); setResSrvFilter('');
    setShowModal(true);
  };

  const openEditProjectModal = (p: Project) => {
    setEditingProject(p);
    setModalTab('DETAILS');
    setFormProject({
      ...p,
      location: p.location || '',
      city: p.city || '',
      detailedDescription: p.detailedDescription || '',
      area: p.area || '',
      costCenter: p.costCenter || '',
      plannedMaterials: p.plannedMaterials || [],
      plannedServices: p.plannedServices || []
    });
    setResMatId(''); setResMatQty(''); setResMatFilter('');
    setResSrvId(''); setResSrvHrs(''); setResSrvFilter('');
    setShowModal(true);
  };

  const addPlannedMaterial = () => {
    if(!resMatId || !resMatQty) return;
    const mat = materials.find(m => m.id === resMatId);
    if (!mat) return;

    const current = formProject.plannedMaterials || [];
    const qty = Number(resMatQty);
    const unitCost = mat.unitCost;

    const existingIndex = current.findIndex(m => m.materialId === resMatId);
    let updatedMaterials;
    
    if(existingIndex >= 0) {
        updatedMaterials = [...current];
        updatedMaterials[existingIndex] = { 
            ...updatedMaterials[existingIndex], 
            quantity: updatedMaterials[existingIndex].quantity + qty,
            unitCost: unitCost 
        };
    } else {
        updatedMaterials = [...current, { materialId: resMatId, quantity: qty, unitCost: unitCost }];
    }
    
    setFormProject({ ...formProject, plannedMaterials: updatedMaterials });
    setResMatId(''); setResMatQty(''); setResMatFilter('');
  };

  const removePlannedMaterial = (id: string) => { 
      setFormProject({ ...formProject, plannedMaterials: (formProject.plannedMaterials || []).filter(m => m.materialId !== id) }); 
  };

  const addPlannedService = () => {
    if(!resSrvId || !resSrvHrs) return;
    const srv = services.find(s => s.id === resSrvId);
    if (!srv) return;

    const current = formProject.plannedServices || [];
    const hrs = Number(resSrvHrs);
    const unitCost = srv.unitValue;

    const existingIndex = current.findIndex(s => s.serviceTypeId === resSrvId);
    let updatedServices;

    if(existingIndex >= 0) {
        updatedServices = [...current];
        updatedServices[existingIndex] = { 
            ...updatedServices[existingIndex], 
            hours: updatedServices[existingIndex].hours + hrs,
            unitCost: unitCost 
        };
    } else {
        updatedServices = [...current, { serviceTypeId: resSrvId, hours: hrs, unitCost: unitCost }];
    }

    setFormProject({ ...formProject, plannedServices: updatedServices });
    setResSrvId(''); setResSrvHrs(''); setResSrvFilter('');
  };

  const removePlannedService = (id: string) => { 
      setFormProject({ ...formProject, plannedServices: (formProject.plannedServices || []).filter(s => s.serviceTypeId !== id) }); 
  };

  // Funções de Cadastro Rápido de Material
  const handleQuickSaveMaterial = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickMat.description || !quickMat.cost || !setMaterials) return;

      const random = Math.floor(1000 + Math.random() * 9000);
      const year = new Date().getFullYear().toString().substr(-2);
      const code = `MAT-${year}-${random}`;

      const newMaterial: Material = {
          id: Math.random().toString(36).substr(2, 9),
          code: code,
          description: quickMat.description,
          group: 'Geral',
          unit: quickMat.unit || 'Un',
          unitCost: Number(quickMat.cost) || 0,
          minStock: 0,
          currentStock: 0,
          location: 'CD - Central',
          stockLocations: [{ name: 'CD - Central', quantity: 0 }],
          status: 'ACTIVE'
      };

      setMaterials(prev => [...prev, newMaterial]);
      setResMatId(newMaterial.id); // Seleciona automaticamente
      setQuickMat({ description: '', unit: 'Un', cost: '' });
      setShowQuickMatModal(false);
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
        auditLogs: [...p.auditLogs, { date: new Date().toISOString(), action: 'Alteração de Escopo', user: currentUser.id }]
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
        auditLogs: [{ date: new Date().toISOString(), action: 'Criação', user: currentUser.id }]
      };
      setProjects([...projects, project]);
    }
    setShowModal(false); setEditingProject(null);
  };

  // Helper para mostrar totais planejados na aba Recursos
  const currentPlannedCosts = useMemo(() => calculatePlannedCosts(formProject, materials, services), [formProject, materials, services]);

  const filteredMaterials = useMemo(() => {
      if (!resMatFilter) return materials;
      return materials.filter(m => m.description.toLowerCase().includes(resMatFilter.toLowerCase()) || m.code.toLowerCase().includes(resMatFilter.toLowerCase()));
  }, [materials, resMatFilter]);

  const filteredServicesList = useMemo(() => {
      if (!resSrvFilter) return services;
      return services.filter(s => s.name.toLowerCase().includes(resSrvFilter.toLowerCase()));
  }, [services, resSrvFilter]);

  const filteredProjects = projects.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportToCSV = () => {
    const headers = ['Código', 'Descrição', 'Status', 'Cidade', 'Responsável', 'Budget (R$)', 'Realizado (R$)', 'Início', 'Fim Estimado'];
    const rows = filteredProjects.map(p => {
        const costs = calculateProjectCosts(p, oss, materials, services);
        return [p.code, `"${p.description}"`, p.status, p.city, p.responsible, p.estimatedValue.toFixed(2).replace('.', ','), costs.totalReal.toFixed(2).replace('.', ','), formatDate(p.startDate), formatDate(p.estimatedEndDate)];
    });
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `projetos_export.csv`; link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    autoTable(doc, { head: [["Código", "Descrição", "Status", "Resp.", "Início", "Budget"]], body: filteredProjects.map(p => [p.code, p.description, p.status, p.responsible, formatDate(p.startDate), `R$ ${formatCurrency(p.estimatedValue)}`]), });
    doc.save(`projetos_export.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div><h2 className="text-3xl font-bold text-slate-900 tracking-tight">Portfólio de Projetos</h2><p className="text-slate-600 text-lg mt-1 font-medium">Gerenciamento de Capex e Obras Industriais.</p></div>
        <div className="flex flex-col xl:flex-row gap-3 w-full md:w-auto items-center">
            <div className="relative group w-full md:w-80"><i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-clean-primary transition-colors"></i><input type="text" placeholder="Buscar..." className="w-full h-12 pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all placeholder:text-slate-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="flex gap-2"><button onClick={exportToCSV} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 h-12"><i className="fas fa-file-csv text-emerald-600 text-xl"></i></button><button onClick={exportToPDF} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 h-12"><i className="fas fa-file-pdf text-red-600 text-xl"></i></button><button onClick={openNewProjectModal} className="bg-clean-primary text-white px-6 py-3 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-clean-primary/90 transition-all shadow-lg shadow-clean-primary/20 flex items-center justify-center gap-2 whitespace-nowrap h-12"><i className="fas fa-plus"></i> Novo Projeto</button></div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {filteredProjects.map(p => {
          const costs = calculateProjectCosts(p, oss, materials, services);
          const budgetPercent = p.estimatedValue > 0 ? (costs.totalReal / p.estimatedValue) * 100 : 0;
          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row overflow-hidden hover:shadow-lg transition-all group relative">
              <div className={`w-3 ${budgetPercent > 100 ? 'bg-red-500' : 'bg-clean-primary'}`}></div>
              <div className="flex-1 p-8">
                 <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                        <div className="flex flex-wrap items-center gap-3 mb-2"><span className="text-sm font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-md border border-slate-300 font-mono">{p.code}</span><span className={`text-sm font-bold px-3 py-1 rounded-md border uppercase ${p.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{p.status}</span></div>
                        <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{p.description}</h3>
                    </div>
                    <div className="flex gap-2 shrink-0"><button onClick={() => openEditProjectModal(p)} className="px-4 py-2.5 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-blue-700 hover:border-blue-400 bg-white hover:bg-blue-50 transition-all text-base font-bold shadow-sm"><i className="fas fa-pencil"></i> Editar</button><button onClick={() => setShowCostDetail(p)} className="px-4 py-2.5 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-clean-primary hover:border-clean-primary bg-white hover:bg-slate-50 transition-all text-base font-bold shadow-sm"><i className="fas fa-eye"></i> Detalhes</button></div>
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
                 
                 {currentUser.role === 'ADMIN' && (
                     <button onClick={() => handleDelete(p.id)} className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-red-200 text-red-500 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm" title="Excluir Projeto"><i className="fas fa-trash text-xs"></i></button>
                 )}
              </div>
            </div>
          );
        })}
      </div>
      {/* MODAL PRINCIPAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col animate-in zoom-in-95 fade-in duration-300 border border-slate-200 overflow-hidden max-h-[90vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0"><div><h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingProject ? 'Editar Projeto' : 'Novo Projeto de Capex'}</h3><p className="text-sm text-slate-500 mt-1">Preencha as informações técnicas e financeiras.</p></div><button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"><i className="fas fa-times"></i></button></div>
            <div className="flex border-b border-slate-200 bg-slate-50 px-8 gap-6 shrink-0"><button onClick={() => setModalTab('DETAILS')} className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === 'DETAILS' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Detalhes</button><button onClick={() => setModalTab('RESOURCES')} className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === 'RESOURCES' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Recursos (Planejamento)</button></div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                <form id="projectForm" onSubmit={handleSave} className="space-y-8">
                    {modalTab === 'DETAILS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">Informações Básicas</h4><div className="grid grid-cols-1 gap-6"><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Título</label><input required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all focus:bg-white" value={formProject.description} onChange={e => setFormProject({...formProject, description: e.target.value})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Escopo</label><textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-sm h-28 custom-scrollbar transition-all focus:bg-white" value={formProject.detailedDescription} onChange={e => setFormProject({...formProject, detailedDescription: e.target.value})} /></div></div></div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">Orçamento & Prazos</h4><div className="grid grid-cols-2 gap-6"><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Budget (R$)</label><input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all focus:bg-white" value={formProject.estimatedValue} onChange={e => setFormProject({...formProject, estimatedValue: Number(e.target.value)})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Prazo (Dias)</label><input type="number" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all focus:bg-white" value={formProject.slaDays} onChange={e => setFormProject({...formProject, slaDays: Number(e.target.value)})} /></div></div></div>
                        </div>
                    )}
                    {modalTab === 'RESOURCES' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                             {/* Painel de Resumo */}
                             <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                 <div>
                                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Custo Total Planejado</span>
                                     <div className="text-2xl font-black text-clean-primary">R$ {formatCurrency(currentPlannedCosts.totalPlanned)}</div>
                                 </div>
                                 <div className="flex gap-4 text-sm text-slate-600">
                                     <span>Mat: <b>R$ {formatCurrency(currentPlannedCosts.matCost)}</b></span>
                                     <span>Serv: <b>R$ {formatCurrency(currentPlannedCosts.srvCost)}</b></span>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                 {/* COLUNA MATERIAIS */}
                                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                                     <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2"><i className="fas fa-cubes text-clean-primary"></i> Materiais Planejados</h4>
                                     
                                     {/* Filtro e Seleção */}
                                     <div className="mb-4">
                                         <input 
                                            type="text" 
                                            placeholder="Filtrar materiais..." 
                                            className="w-full mb-2 h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-clean-primary transition-all"
                                            value={resMatFilter}
                                            onChange={e => setResMatFilter(e.target.value)}
                                         />
                                         <div className="flex gap-2 items-end">
                                             <div className="flex-1">
                                                 <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white transition-all" value={resMatId} onChange={e => setResMatId(e.target.value)}>
                                                     <option value="">Selecione...</option>
                                                     {filteredMaterials.map(m => (
                                                         <option key={m.id} value={m.id}>{m.description} ({m.currentStock} {m.unit})</option>
                                                     ))}
                                                 </select>
                                             </div>
                                             <div className="w-20">
                                                 <input type="number" min="1" placeholder="Qtd" className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white transition-all" value={resMatQty} onChange={e => setResMatQty(e.target.value)} />
                                             </div>
                                             <button type="button" onClick={() => setShowQuickMatModal(true)} className="h-10 w-10 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors" title="Criar Novo Material"><i className="fas fa-magic"></i></button>
                                             <button type="button" onClick={addPlannedMaterial} className="h-10 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"><i className="fas fa-plus"></i></button>
                                         </div>
                                     </div>

                                     <div className="flex-1 overflow-y-auto h-72 custom-scrollbar border border-slate-100 rounded-lg">
                                         <table className="w-full text-sm text-left">
                                             <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase"><tr className="border-b border-slate-100"><th className="p-2">Item</th><th className="p-2 text-right">Qtd</th><th className="p-2 text-right">Custo</th><th className="p-2 w-8"></th></tr></thead>
                                             <tbody>
                                                 {formProject.plannedMaterials?.map(pm => {
                                                     const mat = materials.find(m => m.id === pm.materialId);
                                                     return (
                                                         <tr key={pm.materialId} className="border-b border-slate-50 hover:bg-slate-50">
                                                             <td className="p-2 truncate max-w-[150px]" title={mat?.description}>{mat?.description || 'Item excluído'}</td>
                                                             <td className="p-2 text-right font-mono">{pm.quantity}</td>
                                                             <td className="p-2 text-right text-slate-600">R$ {formatCurrency(pm.quantity * pm.unitCost)}</td>
                                                             <td className="p-2 text-center"><button type="button" onClick={() => removePlannedMaterial(pm.materialId)} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button></td>
                                                         </tr>
                                                     );
                                                 })}
                                                 {(!formProject.plannedMaterials || formProject.plannedMaterials.length === 0) && (
                                                     <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Nenhum material adicionado.</td></tr>
                                                 )}
                                             </tbody>
                                         </table>
                                     </div>
                                 </div>

                                 {/* COLUNA SERVIÇOS */}
                                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                                     <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2"><i className="fas fa-users-cog text-clean-primary"></i> Serviços Planejados</h4>
                                     
                                     {/* Filtro e Seleção */}
                                     <div className="mb-4">
                                         <input 
                                            type="text" 
                                            placeholder="Filtrar serviços..." 
                                            className="w-full mb-2 h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-clean-primary transition-all"
                                            value={resSrvFilter}
                                            onChange={e => setResSrvFilter(e.target.value)}
                                         />
                                         <div className="flex gap-2 items-end">
                                             <div className="flex-1">
                                                 <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white transition-all" value={resSrvId} onChange={e => setResSrvId(e.target.value)}>
                                                     <option value="">Selecione...</option>
                                                     {filteredServicesList.map(s => (
                                                         <option key={s.id} value={s.id}>{s.name} - {s.team}</option>
                                                     ))}
                                                 </select>
                                             </div>
                                             <div className="w-20">
                                                 <input type="number" min="1" placeholder="Hrs" className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white transition-all" value={resSrvHrs} onChange={e => setResSrvHrs(e.target.value)} />
                                             </div>
                                             <button type="button" onClick={addPlannedService} className="h-10 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"><i className="fas fa-plus"></i></button>
                                         </div>
                                     </div>

                                     <div className="flex-1 overflow-y-auto h-72 custom-scrollbar border border-slate-100 rounded-lg">
                                         <table className="w-full text-sm text-left">
                                             <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase"><tr className="border-b border-slate-100"><th className="p-2">Serviço</th><th className="p-2 text-right">Hrs</th><th className="p-2 text-right">Custo</th><th className="p-2 w-8"></th></tr></thead>
                                             <tbody>
                                                 {formProject.plannedServices?.map(ps => {
                                                     const srv = services.find(s => s.id === ps.serviceTypeId);
                                                     return (
                                                         <tr key={ps.serviceTypeId} className="border-b border-slate-50 hover:bg-slate-50">
                                                             <td className="p-2 truncate max-w-[150px]" title={srv?.name}>{srv?.name || 'Serviço excluído'}</td>
                                                             <td className="p-2 text-right font-mono">{ps.hours}</td>
                                                             <td className="p-2 text-right text-slate-600">R$ {formatCurrency(ps.hours * ps.unitCost)}</td>
                                                             <td className="p-2 text-center"><button type="button" onClick={() => removePlannedService(ps.serviceTypeId)} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button></td>
                                                         </tr>
                                                     );
                                                 })}
                                                 {(!formProject.plannedServices || formProject.plannedServices.length === 0) && (
                                                     <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Nenhum serviço adicionado.</td></tr>
                                                 )}
                                             </tbody>
                                         </table>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}
                </form>
            </div>
            <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-10 shrink-0"><button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button><button type="submit" form="projectForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg">Salvar Projeto</button></div>
          </div>
        </div>
      )}
      {showCostDetail && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-300 overflow-hidden border border-slate-200"><div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10"><div><h3 className="text-2xl font-bold text-slate-900 tracking-tight">Detalhamento Financeiro</h3></div><button onClick={() => setShowCostDetail(null)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"><i className="fas fa-times text-lg"></i></button></div><div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">{/* Content */}</div></div></div>
      )}

      {/* QUICK MATERIAL MODAL */}
      {showQuickMatModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Cadastro Rápido de Material</h3>
                  <form onSubmit={handleQuickSaveMaterial} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrição</label>
                          <input autoFocus required className="w-full h-10 px-3 border border-slate-200 rounded-lg" placeholder="Ex: Parafuso Inox" value={quickMat.description} onChange={e => setQuickMat({...quickMat, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Unidade</label>
                              <input required className="w-full h-10 px-3 border border-slate-200 rounded-lg" placeholder="Un, Kg" value={quickMat.unit} onChange={e => setQuickMat({...quickMat, unit: e.target.value})} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Custo Est. (R$)</label>
                              <input type="number" required step="0.01" className="w-full h-10 px-3 border border-slate-200 rounded-lg" value={quickMat.cost} onChange={e => setQuickMat({...quickMat, cost: e.target.value})} />
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setShowQuickMatModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                          <button type="submit" className="px-4 py-2 text-sm font-bold bg-clean-primary text-white rounded-lg hover:bg-clean-primary/90">Salvar e Usar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProjectList;
