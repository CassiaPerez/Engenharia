
import React, { useState, useMemo, useEffect } from 'react';
import { OS, OSStatus, Project, Material, ServiceType, OSService, OSItem, OSType, Building, User } from '../types';
import { calculateOSCosts } from '../services/engine';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  oss: OS[];
  setOss: React.Dispatch<React.SetStateAction<OS[]>>;
  projects: Project[];
  buildings: Building[]; 
  materials: Material[];
  services: ServiceType[];
  users: User[]; // Lista de usuários para selecionar o executor
  setUsers: React.Dispatch<React.SetStateAction<User[]>>; // Para adicionar novos executores
  onStockChange: (mId: string, qty: number, osNumber: string) => void;
}

const ITEMS_PER_PAGE = 9;

const OSList: React.FC<Props> = ({ oss, setOss, projects, buildings, materials, services, users, setUsers, onStockChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'materials'>('services');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filtros
  const [searchInput, setSearchInput] = useState(''); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('ALL');

  // Estado para criação
  const [formOS, setFormOS] = useState<Partial<OS>>({ priority: 'MEDIUM', status: OSStatus.OPEN, slaHours: 24, type: OSType.PREVENTIVE });
  const [creationContext, setCreationContext] = useState<'PROJECT' | 'BUILDING'>('PROJECT');
  
  // Estado para novo item na OS
  const [newItem, setNewItem] = useState<{ id: string, qty: number | '', cost: number | '' }>({ id: '', qty: '', cost: '' });

  // Estado para criação rápida de Executor
  const [showExecutorModal, setShowExecutorModal] = useState(false);
  const [newExecutorData, setNewExecutorData] = useState({ name: '', email: '', department: '' });

  // Lista de Executores (Prestadores de Serviço)
  const executors = useMemo(() => users.filter(u => u.role === 'EXECUTOR'), [users]);

  // Debounce do Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filtragem Avançada
  const filteredOSs = useMemo(() => {
    return oss.filter(os => {
      const matchesSearch = os.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            os.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || os.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || os.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [oss, searchTerm, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filteredOSs.length / ITEMS_PER_PAGE);
  const currentOSs = filteredOSs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleStatusChange = (osId: string, newStatus: OSStatus) => {
    const now = new Date().toISOString();
    
    setOss(prev => prev.map(o => {
      if (o.id !== osId) return o;
      
      const updates: Partial<OS> = { status: newStatus };
      
      if (newStatus === OSStatus.IN_PROGRESS && o.status === OSStatus.OPEN) {
        updates.startTime = now;
      }
      if (newStatus === OSStatus.COMPLETED) {
        updates.endTime = now;
      }
      if (o.status === OSStatus.COMPLETED && newStatus === OSStatus.IN_PROGRESS) {
        updates.endTime = undefined;
      }

      return { ...o, ...updates };
    }));

    if (selectedOS?.id === osId) {
      setSelectedOS(prev => {
        if (!prev) return null;
        const updates: Partial<OS> = { status: newStatus };
        if (newStatus === OSStatus.IN_PROGRESS && prev.status === OSStatus.OPEN) updates.startTime = now;
        if (newStatus === OSStatus.COMPLETED) updates.endTime = now;
        if (prev.status === OSStatus.COMPLETED && newStatus === OSStatus.IN_PROGRESS) updates.endTime = undefined;
        return { ...prev, ...updates };
      });
    }
  };

  const isEditable = (os: OS) => os.status !== OSStatus.COMPLETED && os.status !== OSStatus.CANCELED;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      let cost: number | '' = '';
      if (id) {
          if (activeSubTab === 'services') {
              const s = services.find(s => s.id === id);
              if (s) cost = s.unitValue;
          } else {
              const m = materials.find(m => m.id === id);
              if (m) cost = m.unitCost;
          }
      }
      setNewItem({ id, qty: '', cost });
  };

  const handleAddService = () => {
    if (!selectedOS || !newItem.id || !newItem.qty || newItem.cost === '' || !isEditable(selectedOS)) return;
    const serviceTemplate = services.find(s => s.id === newItem.id);
    if (!serviceTemplate) return;
    
    const finalCost = Number(newItem.cost);
    const newEntry: OSService = { serviceTypeId: serviceTemplate.id, quantity: Number(newItem.qty), unitCost: finalCost, timestamp: new Date().toISOString() };
    const updatedOS = { ...selectedOS, services: [...selectedOS.services, newEntry] };
    setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
    setSelectedOS(updatedOS); setNewItem({ id: '', qty: '', cost: '' });
  };

  const handleAddMaterial = () => {
    if (!selectedOS || !newItem.id || !newItem.qty || newItem.cost === '' || !isEditable(selectedOS)) return;
    const materialTemplate = materials.find(m => m.id === newItem.id);
    if (!materialTemplate || materialTemplate.currentStock < Number(newItem.qty)) { alert("Estoque insuficiente."); return; }
    
    const finalCost = Number(newItem.cost);
    const newEntry: OSItem = { materialId: materialTemplate.id, quantity: Number(newItem.qty), unitCost: finalCost, timestamp: new Date().toISOString() };
    onStockChange(materialTemplate.id, Number(newItem.qty), selectedOS.number);
    const updatedOS = { ...selectedOS, materials: [...selectedOS.materials, newEntry] };
    setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
    setSelectedOS(updatedOS); setNewItem({ id: '', qty: '', cost: '' });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // Validação: Precisa ter um Project ID OU um Building ID
    if (!formOS.projectId && !formOS.buildingId) return;

    setOss(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9), number: `OS-${Date.now().toString().slice(-4)}`,
      projectId: formOS.projectId, // Pode ser undefined
      buildingId: formOS.buildingId, // Pode ser undefined
      executorId: formOS.executorId, // Vincula o prestador
      description: formOS.description || '', type: formOS.type || OSType.PREVENTIVE,
      priority: formOS.priority as any, slaHours: Number(formOS.slaHours), openDate: new Date().toISOString(),
      limitDate: new Date(Date.now() + (Number(formOS.slaHours)) * 3600000).toISOString(), status: OSStatus.OPEN, materials: [], services: []
    }]);
    setShowModal(false); 
    setFormOS({ priority: 'MEDIUM', status: OSStatus.OPEN, slaHours: 24, type: OSType.PREVENTIVE });
    setCreationContext('PROJECT');
  };

  const handleCreateExecutor = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newExecutorData.name || !newExecutorData.email) return;

      const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: newExecutorData.name,
          email: newExecutorData.email,
          password: '123', // Senha padrão
          role: 'EXECUTOR',
          department: newExecutorData.department || 'Manutenção',
          active: true,
          avatar: newExecutorData.name.substr(0, 2).toUpperCase()
      };

      setUsers(prev => [...prev, newUser]);
      setFormOS(prev => ({ ...prev, executorId: newUser.id })); // Auto-seleciona o novo executor
      setShowExecutorModal(false);
      setNewExecutorData({ name: '', email: '', department: '' });
  };

  // --- GOOGLE CALENDAR INTEGRATION ---
  const handleGoogleCalendarSync = (os: OS) => {
    // 1. Busca dados do contexto (Executor e Local)
    const executor = users.find(u => u.id === os.executorId);
    const context = getContextInfo(os);
    
    // 2. Formata datas para o padrão Google (YYYYMMDDTHHMMSSZ)
    const formatDateForGoogle = (dateStr: string) => {
        return new Date(dateStr).toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    // Define início e fim. Se não tiver start definido, usa agora. Duração padrão 2h se não tiver data final.
    const start = os.startTime ? formatDateForGoogle(os.startTime) : formatDateForGoogle(os.openDate);
    const end = os.limitDate ? formatDateForGoogle(os.limitDate) : formatDateForGoogle(new Date(new Date(os.openDate).getTime() + 2 * 60 * 60 * 1000).toISOString());

    // 3. Monta o Link
    const title = encodeURIComponent(`OS ${os.number} - ${os.description.substring(0, 40)}...`);
    const details = encodeURIComponent(
        `Serviço: ${os.description}\n` +
        `Prioridade: ${os.priority}\n` +
        `Tipo: ${os.type}\n` +
        `Local: ${context.label} - ${context.sub}\n` +
        `Sistema: CropService`
    );
    const location = encodeURIComponent(`${context.label}, ${context.sub}`);
    const emails = executor?.email ? encodeURIComponent(executor.email) : '';

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${start}/${end}&add=${emails}`;

    // 4. Abre em nova aba
    window.open(googleUrl, '_blank');
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusTooltip = (status: OSStatus) => {
      switch (status) {
          case OSStatus.OPEN: return 'Aguardando início.';
          case OSStatus.IN_PROGRESS: return 'Atividade em execução.';
          case OSStatus.PAUSED: return 'Atividade paralisada.';
          case OSStatus.COMPLETED: return 'Atividade concluída.';
          case OSStatus.CANCELED: return 'Atividade cancelada.';
          default: return '';
      }
  };

  // Helper para obter nome do contexto (Projeto ou Edifício)
  const getContextInfo = (os: OS) => {
      if (os.projectId) {
          const p = projects.find(proj => proj.id === os.projectId);
          return { label: p?.code || 'N/A', sub: p?.city || '', type: 'PROJECT' };
      } else if (os.buildingId) {
          const b = buildings.find(bld => bld.id === os.buildingId);
          return { label: b?.name || 'N/A', sub: b?.city || '', type: 'BUILDING' };
      }
      return { label: '---', sub: '', type: 'UNKNOWN' };
  };

  const generateOSDetailPDF = (os: OS) => {
    const doc = new jsPDF();
    const costs = calculateOSCosts(os, materials, services);
    const context = getContextInfo(os);
    const executor = users.find(u => u.id === os.executorId);

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`ORDEM DE SERVIÇO: ${os.number}`, 14, 13);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    let yPos = 30;
    doc.text(`Vínculo: ${context.type === 'PROJECT' ? 'Projeto' : 'Edifício'} - ${context.label}`, 14, yPos);
    yPos += 6;
    doc.text(`Status: ${os.status} | Prioridade: ${os.priority} | Tipo: ${os.type}`, 14, yPos);
    yPos += 6;
    doc.text(`Executor: ${executor ? executor.name : 'Não Atribuído'}`, 14, yPos);
    yPos += 6;
    doc.text(`Datas: Aberta em ${new Date(os.openDate).toLocaleDateString()} | Limite: ${new Date(os.limitDate).toLocaleDateString()}`, 14, yPos);
    
    if (os.startTime) {
        yPos += 6;
        doc.text(`Execução: Início ${new Date(os.startTime).toLocaleString()} ${os.endTime ? `| Fim ${new Date(os.endTime).toLocaleString()}` : ''}`, 14, yPos);
    }
    
    yPos += 8;
    doc.text(`Descrição da Atividade:`, 14, yPos);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(os.description, 170);
    doc.text(descLines, 14, yPos + 5);
    yPos += descLines.length * 5 + 10;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 122, 127);
    doc.text("CUSTOS E RECURSOS APLICADOS", 14, yPos);
    yPos += 8;

    const summaryData = [
        ["Custo Total Materiais", `R$ ${formatCurrency(costs.materialCost)}`],
        ["Custo Total Serviços", `R$ ${formatCurrency(costs.serviceCost)}`],
        ["CUSTO TOTAL DA OS", `R$ ${formatCurrency(costs.totalCost)}`]
    ];

    autoTable(doc, { startY: yPos, head: [], body: summaryData, theme: 'plain', styles: { fontSize: 10, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } } });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setTextColor(0,0,0);
    doc.text("MATERIAIS CONSUMIDOS", 14, yPos);
    yPos += 5;

    const matRows = os.materials.map(m => {
        const matDesc = materials.find(x => x.id === m.materialId)?.description || 'Item excluído';
        return [matDesc, m.quantity.toString(), `R$ ${formatCurrency(m.unitCost)}`, `R$ ${formatCurrency(m.quantity * m.unitCost)}`];
    });

    if (matRows.length > 0) {
        autoTable(doc, { startY: yPos, head: [['Item', 'Qtd', 'Vl. Unit', 'Total']], body: matRows, styles: { fontSize: 8 }, headStyles: { fillColor: [71, 122, 127] }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } } });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.text("Nenhum material consumido.", 14, yPos + 5); yPos += 15;
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("SERVIÇOS EXECUTADOS", 14, yPos); yPos += 5;
    const srvRows = os.services.map(s => {
        const srvName = services.find(x => x.id === s.serviceTypeId)?.name || 'Serviço excluído';
        return [srvName, `${s.quantity} h`, `R$ ${formatCurrency(s.unitCost)}`, `R$ ${formatCurrency(s.quantity * s.unitCost)}`];
    });

    if (srvRows.length > 0) {
        autoTable(doc, { startY: yPos, head: [['Serviço', 'Tempo', 'Vl. Unit', 'Total']], body: srvRows, styles: { fontSize: 8 }, headStyles: { fillColor: [71, 122, 127] }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } } });
    } else {
        doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.text("Nenhum serviço apontado.", 14, yPos + 5);
    }
    doc.save(`${os.number}_Detalhado.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h2>
          <p className="text-slate-600 text-lg mt-1 font-medium">Gestão Operacional e Apontamentos.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
            {/* Filtros */}
            <div className="flex gap-2 w-full md:w-auto">
               <div className="relative group w-full md:w-56">
                 <i className={`fas ${searchTerm !== searchInput ? 'fa-spinner fa-spin' : 'fa-search'} absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg transition-all`}></i>
                 <input 
                    type="text" 
                    placeholder="Buscar OS..." 
                    className="w-full h-12 pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                 />
               </div>
               <select className="h-12 px-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                   <option value="ALL">Todos Status</option>
                   {Object.values(OSStatus).map(s => <option key={s} value={s}>{s}</option>)}
               </select>
               <select className="h-12 px-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)}>
                   <option value="ALL">Todas Prioridades</option>
                   <option value="LOW">Baixa</option>
                   <option value="MEDIUM">Média</option>
                   <option value="HIGH">Alta</option>
                   <option value="CRITICAL">Crítica</option>
               </select>
            </div>

            {/* Ações */}
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-clean-primary text-white px-6 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-clean-primary/90 transition-all shadow-lg shadow-clean-primary/20 h-12 whitespace-nowrap"><i className="fas fa-plus mr-2"></i> Abrir OS</button>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentOSs.map(os => {
            const context = getContextInfo(os);
            const costs = calculateOSCosts(os, materials, services);
            const isOverdue = os.status !== OSStatus.COMPLETED && new Date(os.limitDate) < new Date();
            const executor = users.find(u => u.id === os.executorId);
            
            return (
              <div key={os.id} className={`bg-white rounded-xl border p-6 shadow-sm hover:shadow-lg transition-all flex flex-col ${isOverdue ? 'border-l-8 border-l-red-500 border-t-slate-200 border-r-slate-200 border-b-slate-200' : 'border-slate-200'}`}>
                 <div className="flex justify-between items-start mb-4">
                    <span className="font-mono text-base font-bold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-800 border border-slate-300">{os.number}</span>
                    <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border ${os.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : os.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{os.priority}</span>
                 </div>
                 <h4 className="text-xl font-bold text-slate-900 mb-3 leading-tight flex-1 line-clamp-2">{os.description}</h4>
                 <div className="mb-4">
                     <p className="text-sm text-slate-600 truncate font-medium flex items-center gap-2 mb-1">
                         <i className={`fas ${context.type === 'PROJECT' ? 'fa-folder' : 'fa-building'} text-slate-400 w-4`}></i> 
                         {context.label}
                     </p>
                     <p className="text-sm text-slate-600 truncate font-medium flex items-center gap-2">
                        <i className="fas fa-user-hard-hat text-slate-400 w-4"></i>
                        {executor ? <span className="text-emerald-600 font-bold">{executor.name}</span> : <span className="text-slate-400 italic">Sem executor</span>}
                     </p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 text-base mb-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <span className="block text-slate-500 font-bold text-xs uppercase mb-1">Materiais</span>
                        <span className="font-bold text-slate-800 text-lg">R$ {formatCurrency(costs.materialCost)}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <span className="block text-slate-500 font-bold text-xs uppercase mb-1">Mão de Obra</span>
                        <span className="font-bold text-slate-800 text-lg">{os.services.reduce((a,b)=>a+b.quantity,0)} h</span>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                    <span 
                        title={getStatusTooltip(os.status)} 
                        className={`text-sm font-bold uppercase px-3 py-1.5 rounded cursor-help ${os.status === 'COMPLETED' ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : os.status === 'IN_PROGRESS' ? 'text-blue-800 bg-blue-100 border border-blue-200' : 'text-slate-700 bg-slate-100 border border-slate-200'}`}
                    >
                        {os.status.replace('_', ' ')}
                    </span>
                    <button onClick={() => setSelectedOS(os)} className="text-base font-bold text-slate-700 hover:text-white hover:bg-clean-primary px-5 py-2.5 rounded-lg transition-all border border-slate-300 hover:border-clean-primary hover:shadow-md">
                        <i className="fas fa-pen-to-square mr-2"></i> {os.status === OSStatus.COMPLETED ? 'Visualizar' : 'Gerenciar'}
                    </button>
                 </div>
              </div>
            );
        })}
      </div>
      
      {filteredOSs.length === 0 && <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400 text-lg">Nenhuma Ordem de Serviço encontrada.</div>}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-8">
            <button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)} className="w-12 h-12 rounded-lg border border-slate-300 text-slate-600 hover:bg-white hover:shadow disabled:opacity-50 transition-all flex items-center justify-center text-lg"><i className="fas fa-chevron-left"></i></button>
            <span className="px-6 h-12 flex items-center justify-center bg-white rounded-lg border border-slate-300 text-base font-bold text-slate-800 shadow-sm">Pág {currentPage} de {totalPages}</span>
            <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)} className="w-12 h-12 rounded-lg border border-slate-300 text-slate-600 hover:bg-white hover:shadow disabled:opacity-50 transition-all flex items-center justify-center text-lg"><i className="fas fa-chevron-right"></i></button>
        </div>
      )}

      {selectedOS && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in zoom-in duration-200">
             {/* Header do Modal Gerenciar OS */}
             <div className="p-8 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                <div>
                   <h3 className="text-3xl font-bold text-slate-900">Gerenciamento: <span className="text-clean-primary">{selectedOS.number}</span></h3>
                   <div className="flex items-center gap-3 mt-2">
                     <span title={getStatusTooltip(selectedOS.status)} className={`text-sm font-bold uppercase px-3 py-1 rounded cursor-help ${selectedOS.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{selectedOS.status}</span>
                     {selectedOS.startTime && <span className="text-sm text-slate-500 font-mono">Início: {new Date(selectedOS.startTime).toLocaleString()}</span>}
                   </div>
                   {users.find(u => u.id === selectedOS.executorId) && (
                       <p className="text-sm font-bold text-emerald-600 mt-2 flex items-center gap-2">
                           <i className="fas fa-user-hard-hat"></i> Executor: {users.find(u => u.id === selectedOS.executorId)?.name}
                       </p>
                   )}
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleGoogleCalendarSync(selectedOS)} className="bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg font-bold text-base transition-all border border-slate-300 hover:border-blue-300 shadow-sm flex items-center gap-2" title="Enviar convite para Google Agenda">
                        <i className="fab fa-google"></i> Agendar
                    </button>
                    <button onClick={() => generateOSDetailPDF(selectedOS)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-3 rounded-lg font-bold text-base transition-all border border-slate-200 flex items-center gap-2">
                        <i className="fas fa-print"></i> Imprimir OS
                    </button>
                    <button onClick={() => setSelectedOS(null)} className="w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times text-2xl"></i></button>
                </div>
             </div>
             
             {/* Conteúdo Modal */}
             <div className="flex-1 flex overflow-hidden">
                <div className="w-[380px] lg:w-[450px] bg-slate-50 border-r border-slate-200 p-8 flex flex-col shadow-inner overflow-y-auto">
                    {/* Workflow Actions */}
                    <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h5 className="text-sm font-bold text-slate-500 uppercase mb-4">Ações de Status</h5>
                        <div className="grid grid-cols-2 gap-3">
                           {selectedOS.status === OSStatus.OPEN && (
                               <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.IN_PROGRESS)} className="col-span-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-base shadow-sm transition-all"><i className="fas fa-play mr-2"></i> Iniciar Atividade</button>
                           )}
                           {selectedOS.status === OSStatus.IN_PROGRESS && (
                               <>
                                <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.PAUSED)} className="py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-base shadow-sm transition-all"><i className="fas fa-pause mr-2"></i> Pausar</button>
                                <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.COMPLETED)} className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-base shadow-sm transition-all"><i className="fas fa-check mr-2"></i> Concluir</button>
                                </>
                           )}
                           {selectedOS.status === OSStatus.PAUSED && (
                               <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.IN_PROGRESS)} className="col-span-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-base shadow-sm transition-all"><i className="fas fa-play mr-2"></i> Retomar</button>
                           )}
                           {selectedOS.status === OSStatus.COMPLETED && (
                               <div className="col-span-2 text-center py-4 text-emerald-700 font-bold bg-emerald-50 rounded-lg border border-emerald-200 text-base"><i className="fas fa-check-circle mr-2"></i> OS Finalizada</div>
                           )}
                           {selectedOS.status !== OSStatus.COMPLETED && selectedOS.status !== OSStatus.CANCELED && (
                               <button onClick={() => { if(confirm('Cancelar esta OS?')) handleStatusChange(selectedOS.id, OSStatus.CANCELED)}} className="col-span-2 mt-2 py-3 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm transition-all border border-transparent hover:border-red-200">Cancelar OS</button>
                           )}
                        </div>
                    </div>

                    <div className={`transition-opacity ${!isEditable(selectedOS) ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex bg-white rounded-xl border border-slate-300 p-1.5 mb-6 shadow-sm">
                            <button onClick={()=>setActiveSubTab('services')} className={`flex-1 py-3 text-base font-bold rounded-lg transition-all ${activeSubTab==='services'?'bg-clean-primary text-white shadow':'text-slate-600 hover:text-slate-800'}`}>Serviços</button>
                            <button onClick={()=>setActiveSubTab('materials')} className={`flex-1 py-3 text-base font-bold rounded-lg transition-all ${activeSubTab==='materials'?'bg-clean-primary text-white shadow':'text-slate-600 hover:text-slate-800'}`}>Materiais</button>
                        </div>
                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="text-sm font-bold text-slate-700 uppercase mb-2 block">Item</label>
                                <select className="w-full h-14 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newItem.id} onChange={handleSelectChange}>
                                    <option value="">Selecione...</option>
                                    {activeSubTab==='services' ? services.map(s=><option key={s.id} value={s.id}>{s.name}</option>) : materials.map(m=><option key={m.id} value={m.id}>{m.description} (Saldo: {m.currentStock})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase mb-2 block">{activeSubTab==='services'?'Horas':'Quantidade'}</label>
                                    <input type="number" className="w-full h-14 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newItem.qty} onChange={e=>setNewItem({...newItem, qty:Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 uppercase mb-2 block">R$ Unitário</label>
                                    <input type="number" step="0.01" className="w-full h-14 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newItem.cost} onChange={e=>setNewItem({...newItem, cost:Number(e.target.value)})} />
                                </div>
                            </div>
                            <button onClick={activeSubTab==='services'?handleAddService:handleAddMaterial} className="w-full h-14 bg-slate-800 text-white rounded-lg text-base font-bold hover:bg-slate-900 mt-2 shadow-lg transition-all transform hover:-translate-y-0.5">
                                <i className="fas fa-plus mr-2"></i> Adicionar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-white">
                    {/* SEÇÃO DE EVIDÊNCIA DE EXECUÇÃO */}
                    {selectedOS.status === OSStatus.COMPLETED && selectedOS.completionImage && (
                        <div className="mb-8 p-6 bg-emerald-50/50 rounded-xl border border-emerald-100">
                            <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <i className="fas fa-camera text-emerald-600"></i> Evidência de Execução
                            </h4>
                            <div className="relative group">
                                <img 
                                    src={selectedOS.completionImage} 
                                    alt="Evidência do Serviço" 
                                    className="w-full max-h-[400px] object-contain rounded-lg border border-emerald-200 bg-white shadow-sm" 
                                />
                                <a 
                                    href={selectedOS.completionImage} 
                                    download={`evidencia_${selectedOS.number}.png`}
                                    className="absolute bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    <i className="fas fa-download mr-2"></i> Baixar Imagem
                                </a>
                            </div>
                        </div>
                    )}

                    <h4 className="text-base font-black text-slate-900 uppercase border-b border-slate-200 pb-4 mb-6 flex items-center gap-2">
                        <i className="fas fa-clipboard-list text-clean-primary"></i> Detalhamento de Custos
                    </h4>
                    <div className="space-y-8">
                        <div>
                            <h5 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide">Materiais Utilizados</h5>
                            <table className="w-full text-base">
                                <thead className="text-slate-500 border-b border-slate-200 font-bold uppercase text-xs">
                                  <tr className="text-left">
                                    <th className="pb-4 pl-2">Item</th>
                                    <th className="text-right pb-4">Qtd</th>
                                    <th className="text-right pb-4">Vl. Unit</th>
                                    <th className="text-right pb-4 pr-2">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {selectedOS.materials.map((m,i)=>(
                                    <tr key={i}>
                                      <td className="py-4 pl-2 font-bold text-slate-800">{materials.find(mat=>mat.id===m.materialId)?.description}</td>
                                      <td className="text-right font-medium text-slate-600">{m.quantity}</td>
                                      <td className="text-right font-bold text-slate-600">R$ {formatCurrency(m.unitCost)}</td>
                                      <td className="text-right pr-2 font-bold text-slate-900">R$ {formatCurrency(m.quantity*m.unitCost)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                            </table>
                            {selectedOS.materials.length === 0 && <p className="text-slate-400 italic text-base mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">Nenhum material consumido.</p>}
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide">Serviços Executados</h5>
                            <table className="w-full text-base">
                                <thead className="text-slate-500 border-b border-slate-200 font-bold uppercase text-xs">
                                  <tr className="text-left">
                                    <th className="pb-4 pl-2">Serviço</th>
                                    <th className="text-right pb-4">Horas</th>
                                    <th className="text-right pb-4">Vl. Unit</th>
                                    <th className="text-right pb-4 pr-2">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {selectedOS.services.map((s,i)=>(
                                    <tr key={i}>
                                      <td className="py-4 pl-2 font-bold text-slate-800">{services.find(srv=>srv.id===s.serviceTypeId)?.name}</td>
                                      <td className="text-right font-bold text-slate-900">{s.quantity} h</td>
                                      <td className="text-right font-bold text-slate-600">R$ {formatCurrency(s.unitCost)}</td>
                                      <td className="text-right pr-2 font-bold text-slate-900">R$ {formatCurrency(s.quantity * s.unitCost)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                            </table>
                            {selectedOS.services.length === 0 && <p className="text-slate-400 italic text-base mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">Nenhum serviço apontado.</p>}
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                  <h3 className="text-3xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">Nova Ordem de Serviço</h3>
                  <form onSubmit={handleCreate} className="space-y-6">
                      
                      {/* Context Selection Switch */}
                      <div>
                          <label className="text-sm font-bold text-slate-800 mb-2 block uppercase tracking-wide">Vincular OS a:</label>
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                              <button type="button" onClick={() => { setCreationContext('PROJECT'); setFormOS({ ...formOS, buildingId: undefined }); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${creationContext === 'PROJECT' ? 'bg-white text-clean-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Projeto (Capex)</button>
                              <button type="button" onClick={() => { setCreationContext('BUILDING'); setFormOS({ ...formOS, projectId: undefined }); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${creationContext === 'BUILDING' ? 'bg-white text-clean-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Edifício / Facility</button>
                          </div>
                      </div>

                      {creationContext === 'PROJECT' ? (
                          <div>
                              <label className="text-base font-bold text-slate-800 mb-2 block">Selecione o Projeto</label>
                              <select required className="w-full h-14 px-4 bg-white border border-slate-300 rounded-xl text-lg text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.projectId || ''} onChange={e=>setFormOS({...formOS, projectId:e.target.value, buildingId: undefined})}>
                                  <option value="">Selecione...</option>
                                  {projects.map(p=><option key={p.id} value={p.id}>{p.code} - {p.description}</option>)}
                              </select>
                          </div>
                      ) : (
                          <div>
                              <label className="text-base font-bold text-slate-800 mb-2 block">Selecione o Edifício</label>
                              <select required className="w-full h-14 px-4 bg-white border border-slate-300 rounded-xl text-lg text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.buildingId || ''} onChange={e=>setFormOS({...formOS, buildingId:e.target.value, projectId: undefined})}>
                                  <option value="">Selecione...</option>
                                  {buildings.map(b=><option key={b.id} value={b.id}>{b.name} - {b.city}</option>)}
                              </select>
                          </div>
                      )}

                      <div>
                          <label className="text-base font-bold text-slate-800 mb-2 block">Selecione o Executor (Prestador)</label>
                          <div className="flex gap-2">
                              <select className="flex-1 h-14 px-4 bg-white border border-slate-300 rounded-xl text-lg text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.executorId || ''} onChange={e=>setFormOS({...formOS, executorId:e.target.value})}>
                                  <option value="">Sem Executor Específico</option>
                                  {executors.map(u => (
                                      <option key={u.id} value={u.id}>{u.name} - {u.department}</option>
                                  ))}
                              </select>
                              <button type="button" onClick={() => setShowExecutorModal(true)} className="h-14 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                                  <i className="fas fa-user-plus"></i> Novo
                              </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">O executor verá esta OS em sua Agenda e Painel.</p>
                      </div>

                      <div>
                          <label className="text-base font-bold text-slate-800 mb-2 block">Descrição da Atividade</label>
                          <textarea required className="w-full p-4 bg-white border border-slate-300 rounded-xl text-lg text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 h-32" placeholder="Descreva o que precisa ser feito..." value={formOS.description} onChange={e=>setFormOS({...formOS, description:e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="text-base font-bold text-slate-800 mb-2 block">Tipo</label>
                              <select className="w-full h-14 px-4 bg-white border border-slate-300 rounded-xl text-lg text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.type} onChange={e=>setFormOS({...formOS, type:e.target.value as any})}>{Object.values(OSType).map(t=><option key={t} value={t}>{t}</option>)}</select>
                          </div>
                          <div>
                              <label className="text-base font-bold text-slate-800 mb-2 block">Prioridade</label>
                              <select className="w-full h-14 px-4 bg-white border border-slate-300 rounded-xl text-lg text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.priority} onChange={e=>setFormOS({...formOS, priority:e.target.value as any})}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select>
                          </div>
                      </div>
                      <div>
                          <label className="text-base font-bold text-slate-800 mb-2 block">SLA (Horas)</label>
                          <input type="number" className="w-full h-14 px-4 bg-white border border-slate-300 rounded-xl text-lg text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.slaHours} onChange={e=>setFormOS({...formOS, slaHours:Number(e.target.value)})} />
                      </div>
                      <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                          <button type="button" onClick={()=>setShowModal(false)} className="px-8 py-3 text-lg font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                          <button type="submit" className="px-10 py-3 bg-clean-primary text-white text-lg font-bold rounded-lg hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transition-all transform hover:-translate-y-0.5">Criar OS</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL DE CRIAÇÃO RÁPIDA DE EXECUTOR */}
      {showExecutorModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                      <h3 className="text-xl font-bold text-slate-900">Novo Executor</h3>
                      <button onClick={() => setShowExecutorModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="fas fa-times"></i></button>
                  </div>
                  <form onSubmit={handleCreateExecutor} className="space-y-4">
                      <div>
                          <label className="text-sm font-bold text-slate-700 block mb-1">Nome Completo</label>
                          <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" value={newExecutorData.name} onChange={e => setNewExecutorData({ ...newExecutorData, name: e.target.value })} placeholder="João Silva" />
                      </div>
                      <div>
                          <label className="text-sm font-bold text-slate-700 block mb-1">Email</label>
                          <input type="email" required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" value={newExecutorData.email} onChange={e => setNewExecutorData({ ...newExecutorData, email: e.target.value })} placeholder="joao@email.com" />
                      </div>
                      <div>
                          <label className="text-sm font-bold text-slate-700 block mb-1">Departamento / Empresa</label>
                          <input className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" value={newExecutorData.department} onChange={e => setNewExecutorData({ ...newExecutorData, department: e.target.value })} placeholder="Manutenção Elétrica" />
                      </div>
                      <div className="pt-2">
                          <button type="submit" className="w-full h-12 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-lg">Cadastrar Executor</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default OSList;
