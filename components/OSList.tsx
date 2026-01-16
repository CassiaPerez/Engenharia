
import React, { useState, useMemo, useEffect } from 'react';
import { OS, OSStatus, Project, Material, ServiceType, OSService, OSItem, OSType } from '../types';
import { calculateOSCosts } from '../services/engine';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  oss: OS[];
  setOss: React.Dispatch<React.SetStateAction<OS[]>>;
  projects: Project[];
  materials: Material[];
  services: ServiceType[];
  onStockChange: (mId: string, qty: number, osNumber: string) => void;
}

const ITEMS_PER_PAGE = 9;

const OSList: React.FC<Props> = ({ oss, setOss, projects, materials, services, onStockChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'materials'>('services');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filtros
  const [searchInput, setSearchInput] = useState(''); // Valor visual do input
  const [searchTerm, setSearchTerm] = useState('');   // Valor efetivo para o filtro (Debounced)
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('ALL');

  const [formOS, setFormOS] = useState<Partial<OS>>({ priority: 'MEDIUM', status: OSStatus.OPEN, slaHours: 24, type: OSType.PREVENTIVE });
  const [newItem, setNewItem] = useState<{ id: string, qty: number | '' }>({ id: '', qty: '' });

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

  // Lógica de Workflow de Status
  const handleStatusChange = (osId: string, newStatus: OSStatus) => {
    const now = new Date().toISOString();
    
    setOss(prev => prev.map(o => {
      if (o.id !== osId) return o;
      
      const updates: Partial<OS> = { status: newStatus };
      
      // Início automático do timer
      if (newStatus === OSStatus.IN_PROGRESS && o.status === OSStatus.OPEN) {
        updates.startTime = now;
      }
      
      // Encerramento automático
      if (newStatus === OSStatus.COMPLETED) {
        updates.endTime = now;
      }

      // Reabertura (limpa data fim se voltar para execução)
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

  const handleAddService = () => {
    if (!selectedOS || !newItem.id || !newItem.qty || !isEditable(selectedOS)) return;
    const serviceTemplate = services.find(s => s.id === newItem.id);
    if (!serviceTemplate) return;
    const newEntry: OSService = { serviceTypeId: serviceTemplate.id, quantity: Number(newItem.qty), unitCost: serviceTemplate.unitValue, timestamp: new Date().toISOString() };
    const updatedOS = { ...selectedOS, services: [...selectedOS.services, newEntry] };
    setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
    setSelectedOS(updatedOS); setNewItem({ id: '', qty: '' });
  };

  const handleAddMaterial = () => {
    if (!selectedOS || !newItem.id || !newItem.qty || !isEditable(selectedOS)) return;
    const materialTemplate = materials.find(m => m.id === newItem.id);
    if (!materialTemplate || materialTemplate.currentStock < Number(newItem.qty)) { alert("Estoque insuficiente."); return; }
    
    const newEntry: OSItem = { materialId: materialTemplate.id, quantity: Number(newItem.qty), unitCost: materialTemplate.unitCost, timestamp: new Date().toISOString() };
    onStockChange(materialTemplate.id, Number(newItem.qty), selectedOS.number);
    const updatedOS = { ...selectedOS, materials: [...selectedOS.materials, newEntry] };
    setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
    setSelectedOS(updatedOS); setNewItem({ id: '', qty: '' });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOS.projectId) return;
    setOss(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9), number: `OS-${Date.now().toString().slice(-4)}`,
      projectId: formOS.projectId!, description: formOS.description || '', type: formOS.type || OSType.PREVENTIVE,
      priority: formOS.priority as any, slaHours: Number(formOS.slaHours), openDate: new Date().toISOString(),
      limitDate: new Date(Date.now() + (Number(formOS.slaHours)) * 3600000).toISOString(), status: OSStatus.OPEN, materials: [], services: []
    }]);
    setShowModal(false); setFormOS({ priority: 'MEDIUM', status: OSStatus.OPEN, slaHours: 24, type: OSType.PREVENTIVE });
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Função auxiliar para Tooltip de Status
  const getStatusTooltip = (status: OSStatus) => {
      switch (status) {
          case OSStatus.OPEN: return 'Aguardando início ou atribuição de técnico.';
          case OSStatus.IN_PROGRESS: return 'Atividade em execução. O tempo está sendo contabilizado.';
          case OSStatus.PAUSED: return 'Atividade paralisada. O tempo não está sendo contabilizado.';
          case OSStatus.COMPLETED: return 'Atividade concluída e encerrada.';
          case OSStatus.CANCELED: return 'Atividade cancelada. Não gera mais custos.';
          default: return '';
      }
  };

  // Exportação (Utilizando a lista filtrada)
  const exportToCSV = () => {
    const headers = ['Número OS', 'Projeto', 'Descrição', 'Tipo', 'Prioridade', 'Status', 'SLA (h)', 'Abertura', 'Custo Total (R$)'];
    const rows = filteredOSs.map(o => {
        const project = projects.find(p => p.id === o.projectId);
        const costs = calculateOSCosts(o, materials, services);
        return [
            o.number,
            project ? project.code : 'N/A',
            `"${o.description}"`, 
            o.type,
            o.priority,
            o.status,
            o.slaHours,
            new Date(o.openDate).toLocaleDateString('pt-BR'),
            costs.totalCost.toFixed(2).replace('.', ',')
        ];
    });

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `os_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Ordens de Serviço - Crop Service", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()} | Filtros: Status=${statusFilter}, Prio=${priorityFilter}`, 14, 22);

    const tableColumn = ["Número", "Projeto", "Tipo", "Prioridade", "Status", "Custo Total"];
    const tableRows = filteredOSs.map(o => {
        const project = projects.find(p => p.id === o.projectId);
        const costs = calculateOSCosts(o, materials, services);
        return [
            o.number,
            project ? project.code : 'N/A',
            o.type,
            o.priority,
            o.status,
            `R$ ${formatCurrency(costs.totalCost)}`
        ];
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 122, 127] }
    });

    doc.save(`os_export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h2>
          <p className="text-slate-600 text-base mt-1 font-medium">Gestão Operacional e Apontamentos.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
            {/* Filtros */}
            <div className="flex gap-2 w-full md:w-auto">
               <div className="relative group w-full md:w-48">
                 <i className={`fas ${searchTerm !== searchInput ? 'fa-spinner fa-spin' : 'fa-search'} absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-all`}></i>
                 <input 
                    type="text" 
                    placeholder="Buscar OS..." 
                    className="w-full h-11 pl-10 pr-4 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                 />
               </div>
               <select className="h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-clean-primary" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                   <option value="ALL">Todos Status</option>
                   {Object.values(OSStatus).map(s => <option key={s} value={s}>{s}</option>)}
               </select>
               <select className="h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-clean-primary" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)}>
                   <option value="ALL">Todas Prioridades</option>
                   <option value="LOW">Baixa</option>
                   <option value="MEDIUM">Média</option>
                   <option value="HIGH">Alta</option>
                   <option value="CRITICAL">Crítica</option>
               </select>
            </div>

            {/* Ações */}
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={exportToCSV} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 rounded-xl font-bold transition-all shadow-sm h-11" title="Exportar CSV"><i className="fas fa-file-csv text-emerald-600 text-lg"></i></button>
                <button onClick={exportToPDF} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 rounded-xl font-bold transition-all shadow-sm h-11" title="Exportar PDF"><i className="fas fa-file-pdf text-red-600 text-lg"></i></button>
                <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-clean-primary text-white px-5 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-clean-primary/90 transition-all shadow-lg shadow-clean-primary/20 h-11 whitespace-nowrap"><i className="fas fa-plus mr-2"></i> Abrir OS</button>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentOSs.map(os => {
            const project = projects.find(p => p.id === os.projectId);
            const costs = calculateOSCosts(os, materials, services);
            const isOverdue = os.status !== OSStatus.COMPLETED && new Date(os.limitDate) < new Date();
            
            return (
              <div key={os.id} className={`bg-white rounded-xl border p-6 shadow-sm hover:shadow-lg transition-all flex flex-col ${isOverdue ? 'border-l-8 border-l-red-500 border-t-slate-200 border-r-slate-200 border-b-slate-200' : 'border-slate-200'}`}>
                 <div className="flex justify-between items-start mb-4">
                    <span className="font-mono text-sm font-bold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-800 border border-slate-300">{os.number}</span>
                    <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border ${os.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : os.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{os.priority}</span>
                 </div>
                 <h4 className="text-lg font-bold text-slate-900 mb-3 leading-tight flex-1 line-clamp-2">{os.description}</h4>
                 <p className="text-sm text-slate-600 mb-6 truncate font-medium"><i className="fas fa-folder text-slate-400 mr-2"></i> {project?.code}</p>
                 
                 <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-slate-500 font-bold text-xs uppercase mb-1">Materiais</span>
                        <span className="font-bold text-slate-800 text-base">R$ {formatCurrency(costs.materialCost)}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-slate-500 font-bold text-xs uppercase mb-1">Mão de Obra</span>
                        <span className="font-bold text-slate-800 text-base">{os.services.reduce((a,b)=>a+b.quantity,0)} h</span>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                    <span 
                        title={getStatusTooltip(os.status)} 
                        className={`text-xs font-bold uppercase px-2 py-1 rounded cursor-help ${os.status === 'COMPLETED' ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : os.status === 'IN_PROGRESS' ? 'text-blue-800 bg-blue-100 border border-blue-200' : 'text-slate-700 bg-slate-100 border border-slate-200'}`}
                    >
                        {os.status.replace('_', ' ')}
                    </span>
                    <button onClick={() => setSelectedOS(os)} className="text-sm font-bold text-slate-700 hover:text-white hover:bg-clean-primary px-4 py-2 rounded-lg transition-all border border-slate-300 hover:border-clean-primary hover:shadow-md">
                        <i className="fas fa-pen-to-square mr-2"></i> {os.status === OSStatus.COMPLETED ? 'Visualizar' : 'Gerenciar'}
                    </button>
                 </div>
              </div>
            );
        })}
      </div>
      
      {filteredOSs.length === 0 && <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400">Nenhuma Ordem de Serviço encontrada com os filtros atuais.</div>}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-8">
            <button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)} className="w-10 h-10 rounded-lg border border-slate-300 text-slate-600 hover:bg-white hover:shadow disabled:opacity-50 transition-all flex items-center justify-center"><i className="fas fa-chevron-left"></i></button>
            <span className="px-4 h-10 flex items-center justify-center bg-white rounded-lg border border-slate-300 text-sm font-bold text-slate-800 shadow-sm">Pág {currentPage} de {totalPages}</span>
            <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)} className="w-10 h-10 rounded-lg border border-slate-300 text-slate-600 hover:bg-white hover:shadow disabled:opacity-50 transition-all flex items-center justify-center"><i className="fas fa-chevron-right"></i></button>
        </div>
      )}

      {selectedOS && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-bold text-slate-900">Gerenciamento: <span className="text-clean-primary">{selectedOS.number}</span></h3>
                   <div className="flex items-center gap-3 mt-1">
                     <span title={getStatusTooltip(selectedOS.status)} className={`text-xs font-bold uppercase px-2 py-0.5 rounded cursor-help ${selectedOS.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{selectedOS.status}</span>
                     {selectedOS.startTime && <span className="text-xs text-slate-500 font-mono">Início: {new Date(selectedOS.startTime).toLocaleString()}</span>}
                     {selectedOS.endTime && <span className="text-xs text-slate-500 font-mono">Fim: {new Date(selectedOS.endTime).toLocaleString()}</span>}
                   </div>
                   <p className="text-sm font-bold text-slate-800 mt-2 bg-slate-100 inline-block px-2 py-1 rounded border border-slate-200">
                        Custo Total: <span className="text-emerald-700">R$ {formatCurrency(calculateOSCosts(selectedOS, materials, services).totalCost)}</span>
                   </p>
                </div>
                <button onClick={() => setSelectedOS(null)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times text-xl"></i></button>
             </div>
             
             <div className="flex-1 flex overflow-hidden">
                <div className="w-[350px] lg:w-[400px] bg-slate-50 border-r border-slate-200 p-8 flex flex-col shadow-inner overflow-y-auto">
                    {/* Workflow Actions */}
                    <div className="mb-8 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Ações de Status</h5>
                        <div className="grid grid-cols-2 gap-2">
                           {selectedOS.status === OSStatus.OPEN && (
                               <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.IN_PROGRESS)} className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"><i className="fas fa-play mr-2"></i> Iniciar Atividade</button>
                           )}
                           {selectedOS.status === OSStatus.IN_PROGRESS && (
                               <>
                                <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.PAUSED)} className="py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm shadow-sm transition-all"><i className="fas fa-pause mr-2"></i> Pausar</button>
                                <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.COMPLETED)} className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"><i className="fas fa-check mr-2"></i> Concluir</button>
                                </>
                           )}
                           {selectedOS.status === OSStatus.PAUSED && (
                               <button onClick={() => handleStatusChange(selectedOS.id, OSStatus.IN_PROGRESS)} className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"><i className="fas fa-play mr-2"></i> Retomar</button>
                           )}
                           {selectedOS.status === OSStatus.COMPLETED && (
                               <div className="col-span-2 text-center py-3 text-emerald-700 font-bold bg-emerald-50 rounded-lg border border-emerald-200 text-sm"><i className="fas fa-check-circle mr-2"></i> OS Finalizada</div>
                           )}
                           {selectedOS.status !== OSStatus.COMPLETED && selectedOS.status !== OSStatus.CANCELED && (
                               <button onClick={() => { if(confirm('Cancelar esta OS?')) handleStatusChange(selectedOS.id, OSStatus.CANCELED)}} className="col-span-2 mt-2 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs transition-all border border-transparent hover:border-red-200">Cancelar OS</button>
                           )}
                        </div>
                    </div>

                    <div className={`transition-opacity ${!isEditable(selectedOS) ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex bg-white rounded-xl border border-slate-300 p-1.5 mb-6 shadow-sm">
                            <button onClick={()=>setActiveSubTab('services')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeSubTab==='services'?'bg-clean-primary text-white shadow':'text-slate-600 hover:text-slate-800'}`}>Serviços</button>
                            <button onClick={()=>setActiveSubTab('materials')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeSubTab==='materials'?'bg-clean-primary text-white shadow':'text-slate-600 hover:text-slate-800'}`}>Materiais</button>
                        </div>
                        <div className="space-y-5 flex-1">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Item</label>
                                <select className="w-full h-11 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newItem.id} onChange={activeSubTab==='services'? (e)=>{setNewItem({id:e.target.value, qty:''})} : (e)=>setNewItem({id:e.target.value, qty:''})}>
                                    <option value="">Selecione...</option>
                                    {activeSubTab==='services' ? services.map(s=><option key={s.id} value={s.id}>{s.name}</option>) : materials.map(m=><option key={m.id} value={m.id}>{m.description} (Saldo: {m.currentStock})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">{activeSubTab==='services'?'Horas':'Quantidade'}</label>
                                <input type="number" className="w-full h-11 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newItem.qty} onChange={e=>setNewItem({...newItem, qty:Number(e.target.value)})} />
                            </div>
                            <button onClick={activeSubTab==='services'?handleAddService:handleAddMaterial} className="w-full h-11 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 mt-2 shadow-lg transition-all transform hover:-translate-y-0.5">
                                <i className="fas fa-plus mr-2"></i> Adicionar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-white">
                    <h4 className="text-sm font-black text-slate-900 uppercase border-b border-slate-200 pb-4 mb-6 flex items-center gap-2">
                        <i className="fas fa-clipboard-list text-clean-primary"></i> Detalhamento de Custos
                    </h4>
                    <div className="space-y-8">
                        <div>
                            <h5 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Materiais Utilizados</h5>
                            <table className="w-full text-sm">
                                <thead className="text-slate-500 border-b border-slate-200 font-bold uppercase text-xs">
                                  <tr className="text-left">
                                    <th className="pb-3 pl-2">Item</th>
                                    <th className="text-right pb-3">Qtd</th>
                                    <th className="text-right pb-3">Vl. Unit</th>
                                    <th className="text-right pb-3 pr-2">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {selectedOS.materials.map((m,i)=>(
                                    <tr key={i}>
                                      <td className="py-3 pl-2 font-bold text-slate-800">{materials.find(mat=>mat.id===m.materialId)?.description}</td>
                                      <td className="text-right font-medium text-slate-600">{m.quantity}</td>
                                      <td className="text-right font-bold text-slate-600">R$ {formatCurrency(m.unitCost)}</td>
                                      <td className="text-right pr-2 font-bold text-slate-900">R$ {formatCurrency(m.quantity*m.unitCost)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                            </table>
                            {selectedOS.materials.length === 0 && <p className="text-slate-400 italic text-sm mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">Nenhum material consumido.</p>}
                        </div>
                        <div>
                            <h5 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Serviços Executados</h5>
                            <table className="w-full text-sm">
                                <thead className="text-slate-500 border-b border-slate-200 font-bold uppercase text-xs">
                                  <tr className="text-left">
                                    <th className="pb-3 pl-2">Serviço</th>
                                    <th className="text-right pb-3">Horas</th>
                                    <th className="text-right pb-3">Vl. Unit</th>
                                    <th className="text-right pb-3 pr-2">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {selectedOS.services.map((s,i)=>(
                                    <tr key={i}>
                                      <td className="py-3 pl-2 font-bold text-slate-800">{services.find(srv=>srv.id===s.serviceTypeId)?.name}</td>
                                      <td className="text-right font-bold text-slate-900">{s.quantity} h</td>
                                      <td className="text-right font-bold text-slate-600">R$ {formatCurrency(s.unitCost)}</td>
                                      <td className="text-right pr-2 font-bold text-slate-900">R$ {formatCurrency(s.quantity * s.unitCost)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                            </table>
                            {selectedOS.services.length === 0 && <p className="text-slate-400 italic text-sm mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">Nenhum serviço apontado.</p>}
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 animate-in zoom-in duration-200">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">Nova Ordem de Serviço</h3>
                  <form onSubmit={handleCreate} className="space-y-6">
                      <div>
                          <label className="text-sm font-bold text-slate-800 mb-2 block">Projeto Vinculado</label>
                          <select required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.projectId} onChange={e=>setFormOS({...formOS, projectId:e.target.value})}>
                              <option value="">Selecione um Projeto...</option>
                              {projects.map(p=><option key={p.id} value={p.id}>{p.code} - {p.description}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-sm font-bold text-slate-800 mb-2 block">Descrição da Atividade</label>
                          <textarea required className="w-full p-4 bg-white border border-slate-300 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 h-32" placeholder="Descreva o que precisa ser feito..." value={formOS.description} onChange={e=>setFormOS({...formOS, description:e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="text-sm font-bold text-slate-800 mb-2 block">Tipo</label>
                              <select className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.type} onChange={e=>setFormOS({...formOS, type:e.target.value as any})}>{Object.values(OSType).map(t=><option key={t} value={t}>{t}</option>)}</select>
                          </div>
                          <div>
                              <label className="text-sm font-bold text-slate-800 mb-2 block">Prioridade</label>
                              <select className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.priority} onChange={e=>setFormOS({...formOS, priority:e.target.value as any})}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select>
                          </div>
                      </div>
                      <div>
                          <label className="text-sm font-bold text-slate-800 mb-2 block">SLA (Horas)</label>
                          <input type="number" className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={formOS.slaHours} onChange={e=>setFormOS({...formOS, slaHours:Number(e.target.value)})} />
                      </div>
                      <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
                          <button type="button" onClick={()=>setShowModal(false)} className="px-6 py-3 text-base font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                          <button type="submit" className="px-8 py-3 bg-clean-primary text-white text-base font-bold rounded-lg hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transition-all transform hover:-translate-y-0.5">Criar OS</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default OSList;
