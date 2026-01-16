
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
  const [tempMatCost, setTempMatCost] = useState(''); // Estado para custo manual

  const [tempSrvId, setTempSrvId] = useState('');
  const [tempSrvHrs, setTempSrvHrs] = useState('');
  const [tempSrvCost, setTempSrvCost] = useState(''); // Estado para custo manual

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

  // Handlers para seleção de material/serviço populando o custo padrão
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
            unitCost: cost // Atualiza o custo se re-adicionar
        };
    } else {
        updatedMaterials = [...current, { materialId: tempMatId, quantity: qty, unitCost: cost }];
    }
    
    setFormProject({ ...formProject, plannedMaterials: updatedMaterials });
    setTempMatId(''); setTempMatQty(''); setTempMatCost('');
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
    setTempSrvId(''); setTempSrvHrs(''); setTempSrvCost('');
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

  // --- PDF GENERATION LOGIC ---
  const generateProjectDetailPDF = (project: Project) => {
    // ... [Mantido igual ao original]
    const doc = new jsPDF();
    const costs = calculateProjectCosts(project, oss, materials, services);

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("FICHA TÉCNICA DE PROJETO (CAPEX)", 14, 13);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    let yPos = 30;
    doc.text(`Código: ${project.code}`, 14, yPos);
    doc.text(`Status: ${project.status}`, 120, yPos);
    yPos += 6;
    doc.text(`Descrição:`, 14, yPos);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(project.description, 170);
    doc.text(descLines, 35, yPos);
    yPos += descLines.length * 5;

    if (project.detailedDescription) {
        doc.setFont("helvetica", "bold");
        doc.text(`Detalhes:`, 14, yPos);
        doc.setFont("helvetica", "normal");
        const detLines = doc.splitTextToSize(project.detailedDescription, 170);
        doc.text(detLines, 35, yPos);
        yPos += detLines.length * 5 + 2;
    }

    doc.setFont("helvetica", "bold");
    doc.text(`Local: ${project.location || '-'} | Cidade: ${project.city || '-'}`, 14, yPos);
    yPos += 6;
    doc.text(`Responsável: ${project.responsible || '-'} | Centro de Custo: ${project.costCenter || '-'}`, 14, yPos);
    yPos += 6;
    doc.text(`Datas: Início ${formatDate(project.startDate)} | Fim Est. ${formatDate(project.estimatedEndDate)}`, 14, yPos);
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setTextColor(71, 122, 127);
    doc.text("RESUMO FINANCEIRO", 14, yPos);
    yPos += 8;
    
    const summaryData = [
        ["Orçamento Aprovado (Budget)", `R$ ${formatCurrency(project.estimatedValue)}`],
        ["Custo Realizado (Total)", `R$ ${formatCurrency(costs.totalReal)}`],
        ["Variação", `R$ ${formatCurrency(costs.variance)} (${costs.variancePercent.toFixed(1)}% utilizado)`]
    ];
    
    autoTable(doc, {
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', width: 80 }, 1: { halign: 'right' } }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.text("PLANEJAMENTO DE MATERIAIS (FÍSICO)", 14, yPos);
    yPos += 5;
    
    const materialRows = project.plannedMaterials.map(pm => {
        const actual = getActualMaterialQty(project.id, pm.materialId);
        const mat = materials.find(m => m.id === pm.materialId);
        const diff = actual - pm.quantity;
        return [
            mat?.code || '-',
            mat?.description || 'Item excluído',
            pm.quantity.toString(),
            actual.toString(),
            diff > 0 ? `+${diff}` : diff.toString()
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Cód', 'Material', 'Plan', 'Real', 'Var']],
        body: materialRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 122, 127] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.text("PLANEJAMENTO DE SERVIÇOS (HH)", 14, yPos);
    yPos += 5;

    const serviceRows = project.plannedServices.map(ps => {
        const actual = getActualServiceHours(project.id, ps.serviceTypeId);
        const srv = services.find(s => s.id === ps.serviceTypeId);
        const diff = actual - ps.hours;
        return [
            srv?.name || 'Serviço excluído',
            ps.hours.toString(),
            actual.toString(),
            diff > 0 ? `+${diff}` : diff.toString()
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Serviço', 'Plan (h)', 'Real (h)', 'Var']],
        body: serviceRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 122, 127] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'center' } }
    });

    doc.save(`${project.code}_Detalhado.pdf`);
  };

  // --- LIST EXPORT FUNCTIONS ---
  const exportToCSV = () => {
    // ... [Mantido igual]
    const headers = ['Código', 'Descrição', 'Status', 'Cidade', 'Responsável', 'Budget (R$)', 'Realizado (R$)', 'Início', 'Fim Estimado'];
    const rows = filteredProjects.map(p => {
        const costs = calculateProjectCosts(p, oss, materials, services);
        return [
            p.code,
            `"${p.description}"`,
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
     // ... [Mantido igual]
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
        headStyles: { fillColor: [71, 122, 127] }
    });

    doc.save(`projetos_export_${new Date().toISOString().split('T')[0]}.pdf`);
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
                <input 
                    type="text" 
                    placeholder="Buscar por código ou nome..." 
                    className="w-full h-12 pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <button onClick={exportToCSV} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 h-12" title="Exportar CSV">
                    <i className="fas fa-file-csv text-emerald-600 text-xl"></i>
                </button>
                <button onClick={exportToPDF} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 h-12" title="Exportar PDF">
                    <i className="fas fa-file-pdf text-red-600 text-xl"></i>
                </button>
                <button onClick={openNewProjectModal} className="bg-clean-primary text-white px-6 py-3 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-clean-primary/90 transition-all shadow-lg shadow-clean-primary/20 flex items-center justify-center gap-2 whitespace-nowrap h-12">
                    <i className="fas fa-plus"></i> Novo Projeto
                </button>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {filteredProjects.map(p => {
          const costs = calculateProjectCosts(p, oss, materials, services);
          const projectOSs = oss.filter(o => o.projectId === p.id);
          const totalOSs = projectOSs.length;
          const activeOSs = projectOSs.filter(o => o.status !== OSStatus.CANCELED);
          const delayedOSCount = activeOSs.filter(o => o.status !== OSStatus.COMPLETED && new Date(o.limitDate) < new Date()).length;
          const budgetPercent = p.estimatedValue > 0 ? (costs.totalReal / p.estimatedValue) * 100 : 0;
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
                            <span className="text-sm font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-md border border-slate-300 font-mono">{p.code}</span>
                            <span className={`text-sm font-bold px-3 py-1 rounded-md border uppercase ${p.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{p.status}</span>
                            {p.city && <span className="text-sm font-bold bg-white text-slate-700 px-2 py-1 rounded-md border border-slate-300 flex items-center gap-1"><i className="fas fa-map-marker-alt text-clean-primary"></i> {p.city}</span>}
                            {delayedOSCount > 0 && <span className="text-sm font-bold bg-red-50 text-red-700 px-3 py-1 rounded-md border border-red-300 flex items-center gap-2"><i className="fas fa-warning"></i> {delayedOSCount} Atrasos</span>}
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{p.description}</h3>
                        <p className="text-base text-slate-600 line-clamp-2 font-medium">{p.detailedDescription || 'Sem descrição detalhada.'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEditProjectModal(p)} className="px-4 py-2.5 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-blue-700 hover:border-blue-400 bg-white hover:bg-blue-50 transition-all text-base font-bold shadow-sm">
                            <i className="fas fa-pencil"></i> <span className="hidden xl:inline">Editar</span>
                        </button>
                        <button onClick={() => setShowCostDetail(p)} className="px-4 py-2.5 rounded-lg border border-slate-300 flex items-center justify-center gap-2 text-slate-600 hover:text-clean-primary hover:border-clean-primary bg-white hover:bg-slate-50 transition-all text-base font-bold shadow-sm">
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
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Execução <span className="font-medium opacity-80 ml-1">({completedOSs}/{totalOSs})</span></span>
                            <span className="text-base font-black text-blue-800">{executionPercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{width: `${executionPercent}%`}}></div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Financeiro</span>
                            <span className={`text-base font-black ${budgetPercent > 100 ? 'text-red-700' : 'text-emerald-700'}`}>{budgetPercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full transition-all duration-1000 ${budgetPercent > 100 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{width: `${Math.min(budgetPercent, 100)}%`}}></div>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
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
        // ... [Detail Modal mantido igual]
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div>
                   <h3 className="text-xl font-bold text-slate-900">Detalhamento Físico-Financeiro</h3>
                   <p className="text-base text-slate-600 mt-1 font-medium">{showCostDetail.code} - {showCostDetail.description}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => generateProjectDetailPDF(showCostDetail)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-sm transition-all border border-slate-200 flex items-center gap-2">
                        <i className="fas fa-print"></i> Imprimir PDF
                    </button>
                    <button onClick={() => setShowCostDetail(null)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times text-xl"></i></button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-900 uppercase mb-5 border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-cubes text-slate-500"></i> Materiais (Plan x Real)</h4>
                        <table className="w-full text-base">
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
                        <table className="w-full text-base">
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
                            <input required className="w-full h-14 px-4 bg-white border border-slate-300 rounded-lg text-lg text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 transition-all placeholder:text-slate-400 font-medium" placeholder="Ex: Ampliação da Linha C" value={formProject.description || ''} onChange={e => setFormProject({...formProject, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Escopo Detalhado</label>
                            <textarea className="w-full p-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 h-32 custom-scrollbar font-medium" placeholder="Descreva os detalhes técnicos..." value={formProject.detailedDescription || ''} onChange={e => setFormProject({...formProject, detailedDescription: e.target.value})} />
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
                             <div className="flex justify-between text-base mb-3 font-bold text-slate-800"><span>Materiais</span> <span className="text-clean-primary">Total: R$ {formatCurrency(plannedCosts.matCost)}</span></div>
                             <div className="flex gap-2 mb-4">
                                <select className="flex-1 h-12 px-3 bg-white border border-slate-300 rounded-lg text-base text-slate-800 font-medium shadow-sm" value={tempMatId} onChange={handleMaterialSelect}>
                                    <option value="">Selecione Material...</option>
                                    {materials.map(m => <option key={m.id} value={m.id}>{m.description}</option>)}
                                </select>
                                <input type="number" className="w-20 h-12 px-2 bg-white border border-slate-300 rounded-lg text-base text-slate-800 font-medium shadow-sm text-center" placeholder="Qtd" value={tempMatQty} onChange={e => setTempMatQty(e.target.value)} />
                                <input type="number" className="w-24 h-12 px-2 bg-white border border-slate-300 rounded-lg text-base text-slate-800 font-medium shadow-sm text-center" placeholder="R$ Unit" value={tempMatCost} onChange={e => setTempMatCost(e.target.value)} />
                                <button type="button" onClick={addPlannedMaterial} className="h-12 px-4 bg-slate-800 hover:bg-slate-900 rounded-lg text-white shadow-sm transition-colors"><i className="fas fa-plus"></i></button>
                             </div>
                             <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {formProject.plannedMaterials?.map((pm, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                                        <span className="truncate flex-1 font-bold text-slate-800">{materials.find(m => m.id === pm.materialId)?.description}</span>
                                        <span className="mx-2 text-slate-500 text-xs">R$ {pm.unitCost}</span>
                                        <span className="font-bold mx-3 bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">{pm.quantity} un</span>
                                        <button type="button" onClick={() => removePlannedMaterial(pm.materialId)} className="text-red-500 hover:text-red-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"><i className="fas fa-trash"></i></button>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                             <div className="flex justify-between text-base mb-3 font-bold text-slate-800"><span>Serviços (HH)</span> <span className="text-clean-primary">Total: R$ {formatCurrency(plannedCosts.srvCost)}</span></div>
                             <div className="flex gap-2 mb-4">
                                <select className="flex-1 h-12 px-3 bg-white border border-slate-300 rounded-lg text-base text-slate-800 font-medium shadow-sm" value={tempSrvId} onChange={handleServiceSelect}>
                                    <option value="">Selecione Serviço...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <input type="number" className="w-20 h-12 px-2 bg-white border border-slate-300 rounded-lg text-base text-slate-800 font-medium shadow-sm text-center" placeholder="Hrs" value={tempSrvHrs} onChange={e => setTempSrvHrs(e.target.value)} />
                                <input type="number" className="w-24 h-12 px-2 bg-white border border-slate-300 rounded-lg text-base text-slate-800 font-medium shadow-sm text-center" placeholder="R$ Unit" value={tempSrvCost} onChange={e => setTempSrvCost(e.target.value)} />
                                <button type="button" onClick={addPlannedService} className="h-12 px-4 bg-slate-800 hover:bg-slate-900 rounded-lg text-white shadow-sm transition-colors"><i className="fas fa-plus"></i></button>
                             </div>
                             <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {formProject.plannedServices?.map((ps, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                                        <span className="truncate flex-1 font-bold text-slate-800">{services.find(s => s.id === ps.serviceTypeId)?.name}</span>
                                        <span className="mx-2 text-slate-500 text-xs">R$ {ps.unitCost}</span>
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
