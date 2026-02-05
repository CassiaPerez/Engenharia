
import React, { useState, useMemo } from 'react';
import { Project, OS, Material, ServiceType, ProjectStatus, Category, OSType, OSStatus, User } from '../types';
import { calculateProjectCosts, calculatePlannedCosts, formatDate } from '../services/engine';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../services/supabase';
import ModalPortal from './ModalPortal';

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  oss: OS[];
  materials: Material[];
  setMaterials?: React.Dispatch<React.SetStateAction<Material[]>>; 
  services: ServiceType[];
  currentUser: User;
}

const ProjectList: React.FC<Props> = ({ projects, setProjects, oss, materials, setMaterials, services, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'DETAILS' | 'RESOURCES'>('DETAILS'); 
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCostDetail, setShowCostDetail] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // States auxiliares para adição de recursos no formulário (AUTOCOMPLETE)
  const [resMatId, setResMatId] = useState('');
  const [resMatSearch, setResMatSearch] = useState(''); 
  const [showMatSuggestions, setShowMatSuggestions] = useState(false);
  const [resMatQty, setResMatQty] = useState('');
  
  const [resSrvId, setResSrvId] = useState('');
  const [resSrvSearch, setResSrvSearch] = useState(''); 
  const [showSrvSuggestions, setShowSrvSuggestions] = useState(false);
  const [resSrvHrs, setResSrvHrs] = useState('');

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
    setResMatId(''); setResMatSearch(''); setResMatQty('');
    setResSrvId(''); setResSrvSearch(''); setResSrvHrs('');
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
    setResMatId(''); setResMatSearch(''); setResMatQty('');
    setResSrvId(''); setResSrvSearch(''); setResSrvHrs('');
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
    setResMatId(''); setResMatSearch(''); setResMatQty(''); 
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
    setResSrvId(''); setResSrvSearch(''); setResSrvHrs(''); 
  };

  const removePlannedService = (id: string) => { 
      setFormProject({ ...formProject, plannedServices: (formProject.plannedServices || []).filter(s => s.serviceTypeId !== id) }); 
  };

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
      
      setResMatId(newMaterial.id);
      setResMatSearch(newMaterial.description);
      
      setQuickMat({ description: '', unit: 'Un', cost: '' });
      setShowQuickMatModal(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = formProject.startDate || '';
    const slaDays = Number(formProject.slaDays) || 30;
    const limitDate = new Date(startDate);
    limitDate.setDate(limitDate.getDate() + slaDays);

    try {
        if (editingProject) {
          const updated: Project = {
            ...editingProject,
            ...formProject,
            estimatedEndDate: limitDate.toISOString().split('T')[0],
            auditLogs: [...editingProject.auditLogs, { date: new Date().toISOString(), action: 'Alteração de Escopo', user: currentUser.id }]
          } as Project;
          setProjects(prev => prev.map(p => p.id === editingProject.id ? updated : p));

          const { error } = await supabase.from('projects').upsert({
              id: updated.id,
              json_content: updated
          });
          if (error) throw error;
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

          const { error } = await supabase.from('projects').insert({
              id: project.id,
              json_content: project
          });
          if (error) throw error;
        }
        setShowModal(false);
        setEditingProject(null);
    } catch (e) {
        console.error('Erro ao salvar projeto:', e);
        alert('Erro ao salvar no banco de dados.');
    }
  };

  const currentPlannedCosts = useMemo(() => calculatePlannedCosts(formProject, materials, services), [formProject, materials, services]);

  const filteredMaterials = useMemo(() => {
      return materials.filter(m => m.description.toLowerCase().includes(resMatSearch.toLowerCase()) || m.code.toLowerCase().includes(resMatSearch.toLowerCase()));
  }, [materials, resMatSearch]);

  const filteredServicesList = useMemo(() => {
      return services.filter(s => s.name.toLowerCase().includes(resSrvSearch.toLowerCase()));
  }, [services, resSrvSearch]);

  const filteredProjects = projects.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getActualMaterialQty = (projectId: string, materialId: string) => oss.filter(o => o.projectId === projectId && o.status !== OSStatus.CANCELED).reduce((acc, o) => acc + (o.materials.find(m => m.materialId === materialId)?.quantity || 0), 0);
  const getActualServiceHours = (projectId: string, serviceId: string) => oss.filter(o => o.projectId === projectId && o.status !== OSStatus.CANCELED).reduce((acc, o) => acc + (o.services.find(s => s.serviceTypeId === serviceId)?.quantity || 0), 0);

  const generateProjectDetailPDF = (project: Project) => {
    const doc = new jsPDF();
    const costs = calculateProjectCosts(project, oss, materials, services);

    // Header Color Block
    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 210, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("FICHA TÉCNICA DE PROJETO (CAPEX)", 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 196, 16, { align: 'right' });

    // Project Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    let yPos = 35;
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
        doc.text(`Escopo:`, 14, yPos);
        doc.setFont("helvetica", "normal");
        const detLines = doc.splitTextToSize(project.detailedDescription, 170);
        doc.text(detLines, 35, yPos);
        yPos += detLines.length * 5 + 4;
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

    // Financial Summary
    doc.setFontSize(11);
    doc.setTextColor(71, 122, 127);
    doc.text("RESUMO FINANCEIRO", 14, yPos);
    yPos += 8;
    
    const summaryData = [
        ["Orçamento Aprovado (Budget)", `R$ ${formatCurrency(project.estimatedValue)}`],
        ["Custo Realizado (Total)", `R$ ${formatCurrency(costs.totalReal)}`],
        ["Variação / Saldo", `R$ ${formatCurrency(costs.variance)} (${costs.variancePercent.toFixed(1)}% utilizado)`]
    ];
    
    autoTable(doc, {
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Materials Table
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

    if (materialRows.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['Cód', 'Material', 'Plan', 'Real', 'Var']],
            body: materialRows,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [71, 122, 127] },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Nenhum material planejado.", 14, yPos + 5);
        yPos += 15;
    }

    // Services Table
    doc.setFontSize(11);
    doc.setTextColor(71, 122, 127);
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

    if (serviceRows.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['Serviço', 'Plan (h)', 'Real (h)', 'Var']],
            body: serviceRows,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [71, 122, 127] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'center' } }
        });
    } else {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Nenhum serviço planejado.", 14, yPos + 5);
    }

    doc.save(`${project.code}_Detalhado.pdf`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('pt-BR');

    // Branding Header
    doc.setFillColor(71, 122, 127); // Brand Green
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE PORTFÓLIO DE PROJETOS (CAPEX)", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    // Data Calculation
    const rows = filteredProjects.map(p => {
        const costs = calculateProjectCosts(p, oss, materials, services);
        const balance = p.estimatedValue - costs.totalReal;
        return [
            p.code,
            p.description,
            p.status,
            p.responsible,
            formatDate(p.startDate),
            formatDate(p.estimatedEndDate),
            `R$ ${formatCurrency(p.estimatedValue)}`,
            `R$ ${formatCurrency(costs.totalReal)}`,
            `R$ ${formatCurrency(balance)}`
        ];
    });

    // Totals Row
    const totalBudget = filteredProjects.reduce((acc, p) => acc + p.estimatedValue, 0);
    const totalReal = filteredProjects.reduce((acc, p) => acc + calculateProjectCosts(p, oss, materials, services).totalReal, 0);
    const totalBalance = totalBudget - totalReal;

    rows.push([
        '', 
        'TOTAIS CONSOLIDADOS', 
        '', 
        '', 
        '', 
        '', 
        `R$ ${formatCurrency(totalBudget)}`, 
        `R$ ${formatCurrency(totalReal)}`, 
        `R$ ${formatCurrency(totalBalance)}`
    ]);

    autoTable(doc, {
        head: [['Código', 'Projeto', 'Status', 'Responsável', 'Início', 'Fim Est.', 'Orçamento (Budget)', 'Realizado', 'Saldo']],
        body: rows,
        startY: 35,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [71, 122, 127], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
             // Style for Summary Row
             if (data.row.index === rows.length - 1) {
                 data.cell.styles.fontStyle = 'bold';
                 data.cell.styles.fillColor = [240, 240, 240];
                 if (data.column.index === 1) data.cell.colSpan = 5;
             }
             // Colorize Balance
             if (data.column.index === 8 && data.row.index !== rows.length - 1) {
                 const val = parseFloat(data.cell.raw.toString().replace('R$ ', '').replace('.', '').replace(',', '.'));
                 if (val < 0) data.cell.styles.textColor = [220, 50, 50];
                 else data.cell.styles.textColor = [50, 150, 100];
             }
        }
    });

    doc.save(`Projetos_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => generateProjectDetailPDF(p)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm" title="Baixar PDF"><i className="fas fa-file-pdf"></i></button>
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
        <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                <div className="relative w-full max-w-6xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"><div><h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingProject ? 'Editar Projeto' : 'Novo Projeto de Capex'}</h3><p className="text-sm text-slate-500 mt-1">Preencha as informações técnicas e financeiras.</p></div><button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"><i className="fas fa-times"></i></button></div>
                    <div className="flex border-b border-slate-200 bg-slate-50 px-8 gap-6 shrink-0"><button onClick={() => setModalTab('DETAILS')} className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === 'DETAILS' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Detalhes</button><button onClick={() => setModalTab('RESOURCES')} className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${modalTab === 'RESOURCES' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Recursos (Planejamento)</button></div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 min-h-0">
                        <form id="projectForm" onSubmit={handleSave} className="space-y-8">
                            {modalTab === 'DETAILS' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">Informações Básicas</h4><div className="grid grid-cols-1 gap-6"><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Título</label><input required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all focus:bg-white" value={formProject.description} onChange={e => setFormProject({...formProject, description: e.target.value})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Escopo</label><textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-sm h-28 custom-scrollbar transition-all focus:bg-white" value={formProject.detailedDescription} onChange={e => setFormProject({...formProject, detailedDescription: e.target.value})} /></div></div></div>
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-6">Orçamento & Prazos</h4><div className="grid grid-cols-2 gap-6"><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Budget (R$)</label><input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all focus:bg-white" value={formProject.estimatedValue} onChange={e => setFormProject({...formProject, estimatedValue: Number(e.target.value)})} /></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Prazo (Dias)</label><input type="number" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm transition-all focus:bg-white" value={formProject.slaDays} onChange={e => setFormProject({...formProject, slaDays: Number(e.target.value)})} /></div></div></div>
                                </div>
                            )}
                            {modalTab === 'RESOURCES' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
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
                                            
                                            <div className="mb-4">
                                                <div className="relative">
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Buscar Material</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:border-clean-primary transition-all mb-2"
                                                        placeholder="Ex: Parafuso..."
                                                        value={resMatSearch}
                                                        onChange={(e) => { setResMatSearch(e.target.value); setResMatId(''); setShowMatSuggestions(true); }}
                                                        onFocus={() => setShowMatSuggestions(true)}
                                                        onBlur={() => setTimeout(() => setShowMatSuggestions(false), 200)}
                                                    />
                                                    {showMatSuggestions && (
                                                        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1 custom-scrollbar top-full left-0">
                                                            {filteredMaterials.length > 0 ? filteredMaterials.map(m => (
                                                                <li key={m.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0" onClick={() => { setResMatId(m.id); setResMatSearch(m.description); setShowMatSuggestions(false); }}>
                                                                    <div className="font-bold text-slate-700">{m.description}</div>
                                                                    <div className="text-xs text-slate-500 flex justify-between"><span>{m.code}</span><span>Estoque: {m.currentStock} {m.unit}</span></div>
                                                                </li>
                                                            )) : (<li className="px-3 py-2 text-sm text-slate-400 italic">Nenhum material encontrado.</li>)}
                                                        </ul>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 items-end">
                                                    <div className="w-24"><input type="number" min="1" placeholder="Qtd" className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white transition-all" value={resMatQty} onChange={e => setResMatQty(e.target.value)} /></div>
                                                    <button type="button" onClick={() => setShowQuickMatModal(true)} className="h-10 w-10 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors" title="Criar Novo Material"><i className="fas fa-magic"></i></button>
                                                    <button type="button" onClick={addPlannedMaterial} className="h-10 flex-1 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-bold text-sm">Adicionar</button>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto h-72 custom-scrollbar border border-slate-100 rounded-lg">
                                                <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase"><tr className="border-b border-slate-100"><th className="p-2">Item</th><th className="p-2 text-right">Qtd</th><th className="p-2 text-right">Custo</th><th className="p-2 w-8"></th></tr></thead>
                                                    <tbody>
                                                        {formProject.plannedMaterials?.map(pm => { const mat = materials.find(m => m.id === pm.materialId); return (<tr key={pm.materialId} className="border-b border-slate-50 hover:bg-slate-50"><td className="p-2 truncate max-w-[150px]" title={mat?.description}>{mat?.description || 'Item excluído'}</td><td className="p-2 text-right font-mono">{pm.quantity}</td><td className="p-2 text-right text-slate-600">R$ {formatCurrency(pm.quantity * pm.unitCost)}</td><td className="p-2 text-center"><button type="button" onClick={() => removePlannedMaterial(pm.materialId)} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button></td></tr>); })}
                                                        {(!formProject.plannedMaterials || formProject.plannedMaterials.length === 0) && (<tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Nenhum material adicionado.</td></tr>)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* COLUNA SERVIÇOS */}
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2"><i className="fas fa-users-cog text-clean-primary"></i> Serviços Planejados</h4>
                                            <div className="mb-4">
                                                <div className="relative">
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Buscar Serviço</label>
                                                    <input type="text" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:border-clean-primary transition-all mb-2" placeholder="Ex: Instalação..." value={resSrvSearch} onChange={(e) => { setResSrvSearch(e.target.value); setResSrvId(''); setShowSrvSuggestions(true); }} onFocus={() => setShowSrvSuggestions(true)} onBlur={() => setTimeout(() => setShowSrvSuggestions(false), 200)} />
                                                    {showSrvSuggestions && (<ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1 custom-scrollbar top-full left-0">{filteredServicesList.length > 0 ? filteredServicesList.map(s => (<li key={s.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0" onClick={() => { setResSrvId(s.id); setResSrvSearch(s.name); setShowSrvSuggestions(false); }}><div className="font-bold text-slate-700">{s.name}</div><div className="text-xs text-slate-500">{s.team} - R$ {s.unitValue}/h</div></li>)) : (<li className="px-3 py-2 text-sm text-slate-400 italic">Nenhum serviço encontrado.</li>)}</ul>)}
                                                </div>
                                                <div className="flex gap-2 items-end">
                                                    <div className="w-24"><input type="number" min="1" placeholder="Hrs" className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white transition-all" value={resSrvHrs} onChange={e => setResSrvHrs(e.target.value)} /></div>
                                                    <button type="button" onClick={addPlannedService} className="h-10 flex-1 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-bold text-sm">Adicionar</button>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto h-72 custom-scrollbar border border-slate-100 rounded-lg">
                                                <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase"><tr className="border-b border-slate-100"><th className="p-2">Serviço</th><th className="p-2 text-right">Hrs</th><th className="p-2 text-right">Custo</th><th className="p-2 w-8"></th></tr></thead>
                                                    <tbody>
                                                        {formProject.plannedServices?.map(ps => { const srv = services.find(s => s.id === ps.serviceTypeId); return (<tr key={ps.serviceTypeId} className="border-b border-slate-50 hover:bg-slate-50"><td className="p-2 truncate max-w-[150px]" title={srv?.name}>{srv?.name || 'Serviço excluído'}</td><td className="p-2 text-right font-mono">{ps.hours}</td><td className="p-2 text-right text-slate-600">R$ {formatCurrency(ps.hours * ps.unitCost)}</td><td className="p-2 text-center"><button type="button" onClick={() => removePlannedService(ps.serviceTypeId)} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button></td></tr>); })}
                                                        {(!formProject.plannedServices || formProject.plannedServices.length === 0) && (<tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Nenhum serviço adicionado.</td></tr>)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                    <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0"><button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button><button type="submit" form="projectForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg">Salvar Projeto</button></div>
                </div>
              </div>
            </div>
        </ModalPortal>
      )}

      {showCostDetail && (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity" onClick={() => setShowCostDetail(null)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                <div className="relative w-full max-w-4xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Detalhamento Financeiro</h3>
                            <p className="text-sm text-slate-500 mt-1 font-medium">{showCostDetail.code} - {showCostDetail.description}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => generateProjectDetailPDF(showCostDetail)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 flex items-center gap-2"><i className="fas fa-print text-red-500"></i> Imprimir PDF</button>
                            <button onClick={() => setShowCostDetail(null)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"><i className="fas fa-times text-lg"></i></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 min-h-0">
                        {(() => {
                            const costs = calculateProjectCosts(showCostDetail, oss, materials, services);
                            return (
                                <>
                                    {/* FINANCIAL SUMMARY CARDS */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Orçamento (Budget)</p><p className="text-3xl font-black text-slate-800">R$ {formatCurrency(showCostDetail.estimatedValue)}</p></div>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div><p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Custo Realizado</p><p className="text-3xl font-black text-blue-900">R$ {formatCurrency(costs.totalReal)}</p><div className="flex gap-3 text-[10px] uppercase font-bold mt-2 pt-2 border-t border-slate-100"><span className="text-slate-500">Mat: <span className="text-slate-700">R$ {formatCurrency(costs.totalMaterials)}</span></span><span className="text-slate-500">Srv: <span className="text-slate-700">R$ {formatCurrency(costs.totalServices)}</span></span></div></div>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"><div className={`absolute top-0 left-0 w-1.5 h-full ${costs.variance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div><p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Saldo / Variação</p><p className={`text-3xl font-black ${costs.variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{costs.variance >= 0 ? '+' : ''} R$ {formatCurrency(costs.variance)}</p><p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{costs.variancePercent.toFixed(1)}% utilizado</p></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* MATERIAIS */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                            <h4 className="text-sm font-bold text-slate-900 uppercase mb-5 border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-cubes text-clean-primary"></i> Materiais (Físico-Financeiro)</h4>
                                            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider"><th className="text-left pb-3">Item</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr></thead><tbody className="divide-y divide-slate-100">{showCostDetail.plannedMaterials.map(pm => { const actualQty = getActualMaterialQty(showCostDetail.id, pm.materialId); const mat = materials.find(m => m.id === pm.materialId); const diff = actualQty - pm.quantity; return (<tr key={pm.materialId}><td className="py-3 text-slate-800 font-bold truncate max-w-[150px]" title={mat?.description}>{mat?.description || '---'}</td><td className="text-right text-slate-500 font-medium">{pm.quantity}</td><td className="text-right text-slate-900 font-bold">{actualQty}</td><td className="text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diff > 0 ? 'bg-red-100 text-red-700' : diff < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{diff > 0 ? `+${diff}` : diff}</span></td></tr>) })} {(!showCostDetail.plannedMaterials || showCostDetail.plannedMaterials.length === 0) && (<tr><td colSpan={4} className="text-center py-4 text-slate-400 italic text-xs">Sem materiais planejados.</td></tr>)}</tbody></table></div>
                                        </div>
                                        {/* SERVIÇOS */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                            <h4 className="text-sm font-bold text-slate-900 uppercase mb-5 border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-clock text-clean-primary"></i> Serviços (Horas)</h4>
                                            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider"><th className="text-left pb-3">Tipo</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr></thead><tbody className="divide-y divide-slate-100">{showCostDetail.plannedServices.map(ps => { const actualHrs = getActualServiceHours(showCostDetail.id, ps.serviceTypeId); const srv = services.find(s => s.id === ps.serviceTypeId); const diff = actualHrs - ps.hours; return (<tr key={ps.serviceTypeId}><td className="py-3 text-slate-800 font-bold truncate max-w-[150px]" title={srv?.name}>{srv?.name || '---'}</td><td className="text-right text-slate-500 font-medium">{ps.hours}</td><td className="text-right text-slate-900 font-bold">{actualHrs}</td><td className="text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diff > 0 ? 'bg-red-100 text-red-700' : diff < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{diff > 0 ? `+${diff}` : diff}</span></td></tr>) })} {(!showCostDetail.plannedServices || showCostDetail.plannedServices.length === 0) && (<tr><td colSpan={4} className="text-center py-4 text-slate-400 italic text-xs">Sem serviços planejados.</td></tr>)}</tbody></table></div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
              </div>
            </div>
        </ModalPortal>
      )}

      {/* QUICK MATERIAL MODAL */}
      {showQuickMatModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[10000]">
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setShowQuickMatModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                  <div className="relative w-full max-w-md my-8 bg-white rounded-xl shadow-2xl p-6 animate-in zoom-in-95">
                      <h3 className="font-bold text-lg text-slate-800 mb-4">Cadastro Rápido de Material</h3>
                      <form onSubmit={handleQuickSaveMaterial} className="space-y-4">
                          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrição</label><input autoFocus required className="w-full h-10 px-3 border border-slate-200 rounded-lg" placeholder="Ex: Parafuso Inox" value={quickMat.description} onChange={e => setQuickMat({...quickMat, description: e.target.value})} /></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Unidade</label><input required className="w-full h-10 px-3 border border-slate-200 rounded-lg" placeholder="Un, Kg" value={quickMat.unit} onChange={e => setQuickMat({...quickMat, unit: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Custo Est. (R$)</label><input type="number" required step="0.01" className="w-full h-10 px-3 border border-slate-200 rounded-lg" value={quickMat.cost} onChange={e => setQuickMat({...quickMat, cost: e.target.value})} /></div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowQuickMatModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-bold bg-clean-primary text-white rounded-lg hover:bg-clean-primary/90">Salvar e Usar</button></div>
                      </form>
                  </div>
              </div>
            </div>
          </ModalPortal>
      )}
    </div>
  );
};

export default ProjectList;
