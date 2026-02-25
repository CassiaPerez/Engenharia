
import React, { useState, useMemo, useEffect } from 'react';
import { OS, OSStatus, Project, Material, ServiceType, OSService, OSItem, OSType, Building, User, Equipment, StockMovement } from '../types';
import { calculateOSCosts } from '../services/engine';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, mapToSupabase } from '../services/supabase';
import { canEditField } from '../services/permissions';
import ModalPortal from './ModalPortal';

interface Props {
  oss: OS[];
  setOss: React.Dispatch<React.SetStateAction<OS[]>>;
  projects: Project[];
  buildings: Building[];
  equipments?: Equipment[];
  materials: Material[];
  setMaterials?: React.Dispatch<React.SetStateAction<Material[]>>;
  services: ServiceType[];
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  movements: StockMovement[];
  onStockChange: (mId: string, qty: number, osNumber: string) => void;
  currentUser: User;
}

const ITEMS_PER_PAGE = 9;

const OSList: React.FC<Props> = ({ oss, setOss, projects, buildings, equipments = [], materials, setMaterials, services, users, setUsers, movements, onStockChange, currentUser }) => {

const getUserDisplayName = (userId?: string) => {
  if (!userId) return '';
  const u: any = (users || []).find((x: any) => x.id === userId);
  return (u?.name || u?.full_name || u?.nome || u?.email || '').toString();
};

const getRequesterName = (osLike: any) => {
  return (osLike?.requesterName || getUserDisplayName(osLike?.requesterId) || 'Não informado').toString();
};

  const [showModal, setShowModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  

// --- CUSTO DE MATERIAIS E SERVIÇOS (itens avulsos) ---
const addCostItem = () => {
  setSelectedOS((prev: any) => {
    if (!prev) return prev;
    return {
      ...prev,
      costItems: [
        ...(prev.costItems || []),
        {
          id: Math.random().toString(36).substr(2, 9),
          type: 'MATERIAL',
          description: '',
          amount: 0,
        },
      ],
    };
  });
};

const updateCostItem = (id: string, patch: any) => {
  setSelectedOS((prev: any) => {
    if (!prev) return prev;
    return {
      ...prev,
      costItems: (prev.costItems || []).map((item: any) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    };
  });
};

const removeCostItem = (id: string) => {
  setSelectedOS((prev: any) => {
    if (!prev) return prev;
    return {
      ...prev,
      costItems: (prev.costItems || []).filter((item: any) => item.id !== id),
    };
  });
};

const [activeSubTab, setActiveSubTab] = useState<'services' | 'materials'>('services');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(''); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('ALL');
  
  const [formOS, setFormOS] = useState<Partial<OS>>({ priority: 'MEDIUM', status: OSStatus.OPEN, slaHours: 24, type: OSType.PREVENTIVE, executorIds: [] });
  const [creationContext, setCreationContext] = useState<'PROJECT' | 'BUILDING' | 'EQUIPMENT'>('PROJECT');
  const [selectedExecutors, setSelectedExecutors] = useState<string[]>([]);
  
  const [allocMatId, setAllocMatId] = useState('');
  const [allocMatSearch, setAllocMatSearch] = useState(''); 
  const [showAllocMatSuggestions, setShowAllocMatSuggestions] = useState(false);
  const [allocMatQty, setAllocMatQty] = useState('');
  const [plannedMaterials, setPlannedMaterials] = useState<OSItem[]>([]);
  
  const [allocSrvId, setAllocSrvId] = useState('');
  const [allocSrvSearch, setAllocSrvSearch] = useState(''); 
  const [showAllocSrvSuggestions, setShowAllocSrvSuggestions] = useState(false);
  const [allocSrvQty, setAllocSrvQty] = useState('');
  const [plannedServices, setPlannedServices] = useState<OSService[]>([]);

  const [showQuickMatModal, setShowQuickMatModal] = useState(false);
  const [quickMat, setQuickMat] = useState({ description: '', unit: 'Un', cost: '' });

  const [newItem, setNewItem] = useState<{ id: string, qty: number | '', cost: number | '' }>({ id: '', qty: '', cost: '' });
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [showDetailSuggestions, setShowDetailSuggestions] = useState(false); 

  const [showExecutorModal, setShowExecutorModal] = useState(false);
  const [newExecutorData, setNewExecutorData] = useState({ name: '', email: '', department: '' });
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [isEditingSLA, setIsEditingSLA] = useState(false);
  const [editingSLAValue, setEditingSLAValue] = useState<number>(24);
  const [equipmentCompanyFilter, setEquipmentCompanyFilter] = useState('');

  const executors = useMemo(() => users.filter(u => u.role === 'EXECUTOR'), [users]);

  const canEditPriority = currentUser.role === 'ADMIN' || canEditField(currentUser.id, 'os', 'priority', currentUser.role);
  const canEditExecutors = currentUser.role === 'ADMIN' || canEditField(currentUser.id, 'os', 'executorIds', currentUser.role);
  const canEditSLA = currentUser.role === 'ADMIN' || canEditField(currentUser.id, 'os', 'slaHours', currentUser.role);

  useEffect(() => { const timer = setTimeout(() => { setSearchTerm(searchInput); }, 300); return () => clearTimeout(timer); }, [searchInput]);
  useEffect(() => { setItemSearchTerm(''); setNewItem({ id: '', qty: '', cost: '' }); }, [activeSubTab]);
  useEffect(() => {
    const handleClickOutside = () => setShowPriorityDropdown(false);
    if (showPriorityDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPriorityDropdown]);

  const handleDelete = async (id: string) => {
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem excluir Ordens de Serviço.');
          return;
      }

      if (confirm('Tem certeza que deseja excluir esta OS? Isso removerá o histórico dela permanentemente.')) {
          const previousOss = [...oss];
          setOss(prev => prev.filter(o => o.id !== id));
          if (selectedOS?.id === id) setSelectedOS(null);

          try {
              const { error } = await supabase.from('oss').delete().eq('id', id);
              if (error) throw error;
          } catch (e: any) {
              console.error('Erro ao excluir OS:', e);
              setOss(previousOss);
              alert(`FALHA AO EXCLUIR:\n${e.message || JSON.stringify(e)}\n\nSOLUÇÃO: Vá em "Sistema > Documentação", copie o novo script "Correção de Permissões" e execute no Supabase.`);
          }
      }
  };

  const handlePriorityChange = async (newPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
      if (!selectedOS) return;
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem alterar a prioridade.');
          return;
      }

      const updatedOS = { ...selectedOS, priority: newPriority };
      setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
      setSelectedOS(updatedOS);
      setShowPriorityDropdown(false);

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase(updatedOS));
          if (error) throw error;

          const toast = document.createElement('div');
          toast.className = "fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-[10000] font-bold animate-in slide-in-from-bottom-5";
          toast.innerText = `Prioridade alterada para ${translatePriority(newPriority)}`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
      } catch (e) {
          console.error('Erro ao atualizar prioridade:', e);
          alert('Erro ao atualizar prioridade no banco de dados.');
      }
  };

  const handleSLAChange = async () => {
      if (!selectedOS) return;
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem alterar o SLA.');
          return;
      }

      if (editingSLAValue <= 0) {
          alert('O SLA deve ser maior que zero.');
          return;
      }

      const newLimitDate = new Date(new Date(selectedOS.openDate).getTime() + editingSLAValue * 3600000).toISOString();
      const updatedOS = { ...selectedOS, slaHours: editingSLAValue, limitDate: newLimitDate };

      setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
      setSelectedOS(updatedOS);
      setIsEditingSLA(false);

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase(updatedOS));
          if (error) throw error;

          const toast = document.createElement('div');
          toast.className = "fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-[10000] font-bold animate-in slide-in-from-bottom-5";
          toast.innerText = `SLA atualizado para ${editingSLAValue} horas`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
      } catch (e) {
          console.error('Erro ao atualizar SLA:', e);
          alert('Erro ao atualizar SLA no banco de dados.');
      }
  };

  const filteredDetailItems = useMemo(() => {
      if (activeSubTab === 'services') {
          return services.filter(s => s.name.toLowerCase().includes(itemSearchTerm.toLowerCase()));
      } else {
          return materials.filter(m => m.description.toLowerCase().includes(itemSearchTerm.toLowerCase()) || m.code.toLowerCase().includes(itemSearchTerm.toLowerCase()));
      }
  }, [materials, services, activeSubTab, itemSearchTerm]);

  const filteredMaterialsForAlloc = useMemo(() => {
      return materials.filter(m => m.description.toLowerCase().includes(allocMatSearch.toLowerCase()) || m.code.toLowerCase().includes(allocMatSearch.toLowerCase()));
  }, [materials, allocMatSearch]);

  const filteredServicesForAlloc = useMemo(() => {
      return services.filter(s => s.name.toLowerCase().includes(allocSrvSearch.toLowerCase()));
  }, [services, allocSrvSearch]);

  const filteredOSs = useMemo(() => {
    return oss.filter(os => {
      const matchesSearch = os.number.toLowerCase().includes(searchTerm.toLowerCase()) || os.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || os.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || os.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [oss, searchTerm, statusFilter, priorityFilter]);

  const filteredEquipments = useMemo(() => {
    if (!equipmentCompanyFilter) return equipments;
    return equipments.filter(eq => eq.location === equipmentCompanyFilter);
  }, [equipments, equipmentCompanyFilter]);

  const uniqueEquipmentCompanies = useMemo(() => {
    return Array.from(new Set(equipments.map(eq => eq.location).filter(Boolean)));
  }, [equipments]);

  const currentOSs = filteredOSs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const isEditable = (os: OS) => os.status !== OSStatus.COMPLETED && os.status !== OSStatus.CANCELED;
  
  const translatePriority = (p: string) => {
      switch(p) {
          case 'LOW': return 'Baixa';
          case 'MEDIUM': return 'Média';
          case 'HIGH': return 'Alta';
          case 'CRITICAL': return 'Crítica';
          default: return p;
      }
  };

  const handleAddItemToOS = async () => {
      if (!selectedOS || !newItem.id || !newItem.qty || !isEditable(selectedOS)) return;

      let updatedOS: OS;
      if (activeSubTab === 'services') {
          const serviceTemplate = services.find(s => s.id === newItem.id);
          if (!serviceTemplate) return;
          const finalCost = serviceTemplate.unitValue;
          const newEntry: OSService = { serviceTypeId: serviceTemplate.id, quantity: Number(newItem.qty), unitCost: finalCost, timestamp: new Date().toISOString() };
          updatedOS = { ...selectedOS, services: [...selectedOS.services, newEntry] };
          setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
          setSelectedOS(updatedOS);
      } else {
          const materialTemplate = materials.find(m => m.id === newItem.id);
          if (!materialTemplate) return;
          if (materialTemplate.currentStock < Number(newItem.qty)) { alert("Estoque insuficiente."); return; }
          const finalCost = materialTemplate.unitCost;
          const newEntry: OSItem = { materialId: materialTemplate.id, quantity: Number(newItem.qty), unitCost: finalCost, timestamp: new Date().toISOString() };
          onStockChange(materialTemplate.id, Number(newItem.qty), selectedOS.number);
          updatedOS = { ...selectedOS, materials: [...selectedOS.materials, newEntry] };
          setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
          setSelectedOS(updatedOS);
      }

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase(updatedOS));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao salvar item na OS:', e);
      }

      setNewItem({ id: '', qty: '', cost: '' });
      setItemSearchTerm('');
  };

  const handleRemoveService = async (index: number) => {
      if (!selectedOS || !isEditable(selectedOS)) return;
      if (!confirm('Deseja realmente remover este serviço da OS?')) return;

      const updatedServices = selectedOS.services.filter((_, i) => i !== index);
      const updatedOS = { ...selectedOS, services: updatedServices };
      setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
      setSelectedOS(updatedOS);

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase(updatedOS));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao remover serviço:', e);
      }
  };

  const handleRemoveMaterial = async (index: number) => {
      if (!selectedOS || !isEditable(selectedOS)) return;
      if (!confirm('Deseja realmente remover este material da OS?')) return;

      const updatedMaterials = selectedOS.materials.filter((_, i) => i !== index);
      const updatedOS = { ...selectedOS, materials: updatedMaterials };
      setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
      setSelectedOS(updatedOS);

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase(updatedOS));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao remover material:', e);
      }
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
      
      setAllocMatId(newMaterial.id);
      setAllocMatSearch(newMaterial.description);

      setQuickMat({ description: '', unit: 'Un', cost: '' });
      setShowQuickMatModal(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formOS.projectId && !formOS.buildingId && !formOS.equipmentId) {
          alert('Selecione um Projeto, Edifício ou Equipamento para vincular a OS.');
          return;
      }

      const newOSNumber = `OS-${Date.now().toString().slice(-4)}`;

      plannedMaterials.forEach(pm => {
          onStockChange(pm.materialId, pm.quantity, newOSNumber);
      });

      const newOS: OS = {
          id: Math.random().toString(36).substr(2, 9),
          number: newOSNumber,
          projectId: formOS.projectId,
          buildingId: formOS.buildingId,
          equipmentId: formOS.equipmentId,
          costCenter: formOS.costCenter,
          executorIds: selectedExecutors.length > 0 ? selectedExecutors : undefined,
          requesterId: currentUser.id,
          requesterName: currentUser.name,
          description: formOS.description || '',
          type: formOS.type || OSType.PREVENTIVE,
          priority: formOS.priority as any,
          slaHours: Number(formOS.slaHours),
          openDate: new Date().toISOString(),
          limitDate: new Date(Date.now() + (Number(formOS.slaHours)) * 3600000).toISOString(),
          status: OSStatus.OPEN,
          materials: plannedMaterials,
          services: plannedServices
      };

      setOss(prev => [...prev, newOS]);

      try {
          const { error } = await supabase.from('oss').insert(mapToSupabase(newOS));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao salvar OS:', e);
          alert('Erro ao salvar no banco de dados.');
      }

      setShowModal(false);
      setFormOS({ priority: 'MEDIUM', status: OSStatus.OPEN, slaHours: 24, type: OSType.PREVENTIVE });
      setCreationContext('PROJECT');
      setPlannedMaterials([]);
      setPlannedServices([]);
  };

  const openNewOS = () => {
      setFormOS({
          priority: 'MEDIUM',
          status: OSStatus.OPEN,
          slaHours: 24,
          type: OSType.PREVENTIVE,
          description: '',
          projectId: '',
          buildingId: '',
          equipmentId: '',
          executorIds: []
      });
      setSelectedExecutors([]);
      setPlannedMaterials([]);
      setPlannedServices([]);
      setAllocMatSearch(''); setAllocMatId('');
      setAllocSrvSearch(''); setAllocSrvId('');
      setCreationContext('PROJECT');
      setEquipmentCompanyFilter('');
      setShowModal(true);
  };

  const addAllocMaterial = () => {
      if(!allocMatId || !allocMatQty) return;
      const mat = materials.find(m => m.id === allocMatId);
      if(!mat) return;
      const qty = Number(allocMatQty);
      if(qty > mat.currentStock) {
          alert(`Estoque insuficiente! Disponível: ${mat.currentStock} ${mat.unit}`);
          return;
      }
      setPlannedMaterials([...plannedMaterials, { materialId: allocMatId, quantity: qty, unitCost: mat.unitCost, timestamp: new Date().toISOString() }]);
      setAllocMatId(''); setAllocMatSearch(''); setAllocMatQty('');
  };

  const addAllocService = () => {
      if(!allocSrvId || !allocSrvQty) return;
      const srv = services.find(s => s.id === allocSrvId);
      if(!srv) return;
      setPlannedServices([...plannedServices, { serviceTypeId: allocSrvId, quantity: Number(allocSrvQty), unitCost: srv.unitValue, timestamp: new Date().toISOString() }]);
      setAllocSrvId(''); setAllocSrvSearch(''); setAllocSrvQty('');
  };

  const handleCreateExecutor = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newExecutorData.name || !newExecutorData.email) return;

      const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: newExecutorData.name,
          email: newExecutorData.email,
          password: '123',
          role: 'EXECUTOR',
          department: newExecutorData.department || 'Manutenção',
          active: true,
          avatar: newExecutorData.name.substr(0, 2).toUpperCase()
      };

      setUsers(prev => [...prev, newUser]);
      setSelectedExecutors(prev => [...prev, newUser.id]);
      setShowExecutorModal(false);
      setNewExecutorData({ name: '', email: '', department: '' });
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getStatusTooltip = (status: OSStatus) => { switch (status) { case OSStatus.OPEN: return 'Aguardando início.'; case OSStatus.IN_PROGRESS: return 'Atividade em execução.'; case OSStatus.PAUSED: return 'Atividade paralisada.'; case OSStatus.COMPLETED: return 'Atividade concluída.'; case OSStatus.CANCELED: return 'Atividade cancelada.'; default: return ''; } };
  const getContextInfo = (os: OS) => { 
      if (os.projectId) { const p = projects.find(proj => proj.id === os.projectId); return { label: p?.code || 'N/A', sub: p?.city || '', type: 'PROJECT' }; } 
      else if (os.buildingId) { const b = buildings.find(bld => bld.id === os.buildingId); return { label: b?.name || 'N/A', sub: b?.city || '', type: 'BUILDING' }; } 
      else if (os.equipmentId) { const eq = equipments.find(e => e.id === os.equipmentId); return { label: eq?.name || 'N/A', sub: eq?.code || '', type: 'EQUIPMENT' }; }
      return { label: '---', sub: '', type: 'UNKNOWN' }; 
  };
  
  const generateOSDetailPDF = (os: OS) => {
    const doc = new jsPDF();
    const context = getContextInfo(os);
    const osExecutors = os.executorIds ? users.filter(u => os.executorIds?.includes(u.id)) : (os.executorId ? [users.find(u => u.id === os.executorId)].filter(Boolean) : []);
    const executorNames = osExecutors.length > 0 ? osExecutors.map(e => e?.name).join(', ') : 'Não Atribuído';
    const costs = calculateOSCosts(os, materials, services);

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 210, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`ORDEM DE SERVIÇO: ${os.number}`, 14, 16);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Emissão: ${new Date().toLocaleString()}`, 196, 16, { align: 'right' });

    let y = 35;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS GERAIS", 14, y);
    doc.setLineWidth(0.5);
    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    const costCenter = (() => {
      if (os.projectId) {
        const project = projects.find(p => p.id === os.projectId);
        return project?.costCenter ? `${project.costCenter} (Projeto)` : 'Não definido';
      }
      return os.costCenter || 'Não definido';
    })();

    const infoData = [
        [`Vínculo: ${context.type}`, `${context.label} - ${context.sub}`],
        ["Centro de Custo", costCenter],
        ["Status", os.status],
        ["Prioridade", translatePriority(os.priority)],
        ["Tipo", os.type],
        ["Solicitante", getRequesterName(os)],
        ["Executor(es)", executorNames],
        ["Abertura", new Date(os.openDate).toLocaleString()],
        ["Prazo Limite", new Date(os.limitDate).toLocaleString()]
    ];

    autoTable(doc, {
        startY: y,
        body: infoData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 100 } }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO DO PROBLEMA SOLICITADO", 14, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(os.description, 180);
    doc.text(descLines, 14, y);
    y += descLines.length * 5 + 10;

    if (os.executionDescription) {
        doc.setFont("helvetica", "bold");
        doc.text("DESCRIÇÃO DO SERVIÇO REALIZADO", 14, y);
        doc.line(14, y + 2, 196, y + 2);
        y += 8;

        doc.setFont("helvetica", "normal");
        const execLines = doc.splitTextToSize(os.executionDescription, 180);
        doc.text(execLines, 14, y);
        y += execLines.length * 5 + 10;
    }

    if (os.completionImage) {
        if (y > 200) {
            doc.addPage();
            y = 40;
        }

        doc.setFont("helvetica", "bold");
        doc.text("FOTO DO SERVIÇO REALIZADO", 14, y);
        doc.line(14, y + 2, 196, y + 2);
        y += 8;

        try {
            doc.addImage(os.completionImage, 'JPEG', 14, y, 90, 90);
            y += 100;
        } catch (e) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.text("(Foto não disponível ou formato inválido)", 14, y);
            y += 10;
        }
    }

    if (os.materials.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("MATERIAIS APLICADOS", 14, y);
        y += 4;
        
        const matRows = os.materials.map(m => {
            const mat = materials.find(x => x.id === m.materialId);
            return [
                mat?.code || '-',
                mat?.description || 'Item excluído',
                m.fromLocation || 'N/E',
                `${m.quantity} ${mat?.unit || ''}`,
                `R$ ${formatCurrency(m.unitCost)}`,
                `R$ ${formatCurrency(m.quantity * m.unitCost)}`
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['Cód', 'Descrição', 'Local', 'Qtd', 'Unit.', 'Total']],
            body: matRows,
            headStyles: { fillColor: [220, 220, 220], textColor: 50 },
            styles: { fontSize: 8 },
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
        });
        
        y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (os.services.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("SERVIÇOS / MÃO DE OBRA", 14, y);
        y += 4;

        const srvRows = os.services.map(s => {
            const srv = services.find(x => x.id === s.serviceTypeId);
            return [
                srv?.name || 'Serviço excluído',
                `${s.quantity} h`,
                `R$ ${formatCurrency(s.unitCost)}`,
                `R$ ${formatCurrency(s.quantity * s.unitCost)}`
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['Serviço', 'Qtd (h)', 'Valor/h', 'Total']],
            body: srvRows,
            headStyles: { fillColor: [220, 220, 220], textColor: 50 },
            styles: { fontSize: 9 },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
        });

        y = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("RESUMO DE CUSTOS", 14, y);
    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    const costSummary = [
      ["Materiais", `R$ ${formatCurrency(costs.materialCost)}${costs.isManualMaterial ? ' (Manual)' : ''}`],
      ["Serviços", `R$ ${formatCurrency(costs.serviceCost)}${costs.isManualService ? ' (Manual)' : ''}`],
      ["TOTAL", `R$ ${formatCurrency(costs.totalCost)}`]
    ];

    autoTable(doc, {
      startY: y,
      body: costSummary,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 100, halign: 'right' }
      },
      didParseCell: (data: any) => {
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 12;
          data.cell.styles.textColor = [71, 122, 127];
        }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    if (y > 250) {
        doc.addPage();
        y = 40;
    }

    doc.setDrawColor(150);
    doc.setLineWidth(0.5);
    doc.setTextColor(100);
    doc.setFontSize(8);

    doc.line(20, y + 20, 90, y + 20);
    doc.text("EXECUTOR RESPONSÁVEL", 55, y + 25, { align: 'center' });

    doc.line(120, y + 20, 190, y + 20);
    doc.text("GESTOR / APROVADOR", 155, y + 25, { align: 'center' });

    doc.save(`OS_${os.number}_Detalhado.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 pb-6">
        <div><h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h2><p className="text-slate-600 text-lg mt-1 font-medium">Gestão Operacional e Apontamentos.</p></div>
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
            <div className="flex gap-2 w-full md:w-auto"><div className="relative group w-full md:w-56"><i className={`fas ${searchTerm !== searchInput ? 'fa-spinner fa-spin' : 'fa-search'} absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg transition-all`}></i><input type="text" placeholder="Buscar OS..." className="w-full h-12 pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={searchInput} onChange={e => setSearchInput(e.target.value)} /></div><select className="h-12 px-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}><option value="ALL">Todos Status</option>{Object.values(OSStatus).map(s => <option key={s} value={s}>{s}</option>)}</select><select className="h-12 px-4 bg-white border border-slate-300 rounded-xl text-base font-medium text-slate-700 shadow-sm focus:border-clean-primary" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)}><option value="ALL">Todas Prioridades</option><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></div>
            <div className="flex gap-2 w-full md:w-auto"><button onClick={openNewOS} className="flex-1 md:flex-none bg-clean-primary text-white px-6 rounded-xl font-bold text-base uppercase tracking-wide hover:bg-clean-primary/90 transition-all shadow-lg shadow-clean-primary/20 h-12 whitespace-nowrap"><i className="fas fa-plus mr-2"></i> Abrir OS</button></div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentOSs.map(os => {
            const context = getContextInfo(os);
            const costs = calculateOSCosts(os, materials, services);
            const isOverdue = os.status !== OSStatus.COMPLETED && new Date(os.limitDate) < new Date();
            const osExecutors = os.executorIds ? users.filter(u => os.executorIds?.includes(u.id)) : (os.executorId ? [users.find(u => u.id === os.executorId)].filter(Boolean) : []);
            return (
              <div key={os.id} className={`bg-white rounded-xl border p-6 shadow-sm hover:shadow-lg transition-all flex flex-col relative group ${
                isOverdue ? 'border-l-8 border-l-red-500 border-t-slate-200 border-r-slate-200 border-b-slate-200' :
                os.priority === 'CRITICAL' ? 'border-l-8 border-l-red-600 border-t-slate-200 border-r-slate-200 border-b-slate-200' :
                os.priority === 'HIGH' ? 'border-l-4 border-l-orange-500 border-t-slate-200 border-r-slate-200 border-b-slate-200' :
                'border-slate-200'
              }`}>
                 <div className="flex justify-between items-start mb-4">
                   <span className="font-mono text-base font-bold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-800 border border-slate-300">{os.number}</span>
                   <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                     os.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                     os.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                     os.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                     'bg-slate-50 text-slate-600 border-slate-200'
                   }`}>
                     {os.priority === 'CRITICAL' && <i className="fas fa-exclamation-triangle"></i>}
                     {os.priority === 'HIGH' && <i className="fas fa-arrow-up"></i>}
                     {translatePriority(os.priority)}
                   </span>
                 </div>
                 <h4 className="text-xl font-bold text-slate-900 mb-3 leading-tight flex-1 line-clamp-2">{os.description}</h4>
                 <div className="mb-4">
                   <p className="text-sm text-slate-600 truncate font-medium flex items-center gap-2 mb-1">
                     <i className={`fas ${context.type === 'PROJECT' ? 'fa-folder' : context.type === 'EQUIPMENT' ? 'fa-cogs' : 'fa-building'} text-slate-400 w-4`}></i> {context.label}
                   </p>
                   <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                     <i className="fas fa-user-hard-hat text-slate-400 w-4"></i>
                     {osExecutors.length > 0 ? (
                       <span className="text-emerald-600 font-bold">
                         {osExecutors.length === 1 ? osExecutors[0]?.name : `${osExecutors.length} Executores`}
                       </span>
                     ) : (
                       <span className="text-slate-400 italic">Sem executor</span>
                     )}
                   </p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-base mb-6"><div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><span className="block text-slate-500 font-bold text-xs uppercase mb-1">Materiais</span><span className="font-bold text-slate-800 text-lg">R$ {formatCurrency(costs.materialCost)}</span></div><div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><span className="block text-slate-500 font-bold text-xs uppercase mb-1">Mão de Obra</span><span className="font-bold text-slate-800 text-lg">{os.services.reduce((a,b)=>a+b.quantity,0)} h</span></div></div>
                 <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto"><span title={getStatusTooltip(os.status)} className={`text-sm font-bold uppercase px-3 py-1.5 rounded cursor-help ${os.status === 'COMPLETED' ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : os.status === 'IN_PROGRESS' ? 'text-blue-800 bg-blue-100 border border-blue-200' : 'text-slate-700 bg-slate-100 border border-slate-200'}`}>{os.status.replace('_', ' ')}</span><button onClick={() => setSelectedOS(os)} className="text-base font-bold text-slate-700 hover:text-white hover:bg-clean-primary px-5 py-2.5 rounded-lg transition-all border border-slate-300 hover:border-clean-primary hover:shadow-md"><i className="fas fa-pen-to-square mr-2"></i> {os.status === OSStatus.COMPLETED ? 'Visualizar' : 'Gerenciar'}</button></div>
                 {currentUser.role === 'ADMIN' && ( <button onClick={() => handleDelete(os.id)} className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-red-200 text-red-500 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm z-20" title="Excluir OS"><i className="fas fa-trash text-xs"></i></button> )}
              </div>
            );
        })}
      </div>
      
      {filteredOSs.length === 0 && <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400 text-lg">Nenhuma Ordem de Serviço encontrada.</div>}
      
      {/* DETAILED MODAL */}
      {selectedOS && (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity" onClick={() => setSelectedOS(null)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                <div className="relative w-full max-w-6xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className={`px-8 py-6 border-b border-slate-100 rounded-t-2xl flex justify-between items-center shrink-0 ${
                      selectedOS.priority === 'CRITICAL' ? 'bg-red-50 border-l-8 border-l-red-600' :
                      selectedOS.priority === 'HIGH' ? 'bg-orange-50 border-l-4 border-l-orange-500' :
                      'bg-white'
                    }`}>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono font-bold text-lg text-slate-900 bg-slate-100 px-3 py-1 rounded border border-slate-300">{selectedOS.number}</span>
                                <span className={`text-xs font-bold uppercase px-3 py-1 rounded border ${selectedOS.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>{selectedOS.status}</span>
                                <span className={`text-xs font-bold uppercase px-3 py-1 rounded border flex items-center gap-1.5 ${
                                  selectedOS.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-300' :
                                  selectedOS.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                  selectedOS.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  'bg-slate-100 text-slate-700 border-slate-300'
                                }`}>
                                  {selectedOS.priority === 'CRITICAL' && <i className="fas fa-exclamation-triangle"></i>}
                                  {selectedOS.priority === 'HIGH' && <i className="fas fa-arrow-up"></i>}
                                  {translatePriority(selectedOS.priority)}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 tracking-tight">{selectedOS.description}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => generateOSDetailPDF(selectedOS)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"><i className="fas fa-file-pdf text-red-500"></i> PDF</button>
                            <button onClick={() => setSelectedOS(null)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200"><i className="fas fa-times text-xl"></i></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex overflow-hidden bg-slate-50/50 min-h-0">
                        {/* LEFT: INFO */}
                        <div className="w-1/3 border-r border-slate-200 p-8 overflow-y-auto custom-scrollbar bg-white">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Informações Técnicas</h4>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Local / Contexto</p>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="font-bold text-slate-800">{getContextInfo(selectedOS).label}</p>
                                        <p className="text-xs text-slate-500">{getContextInfo(selectedOS).sub}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Centro de Custo</p>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="font-bold text-slate-800">
                                            {(() => {
                                                if (selectedOS.projectId) {
                                                    const project = projects.find(p => p.id === selectedOS.projectId);
                                                    return project?.costCenter || 'Não definido';
                                                }
                                                return selectedOS.costCenter || 'Não definido';
                                            })()}
                                        </p>
                                        {selectedOS.projectId && <p className="text-xs text-slate-500">Herdado do Projeto</p>}
                                    </div>
                                </div>
                                {(currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'EXECUTOR') && getRequesterName(selectedOS) !== 'Não informado' && (
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Solicitante</p>
                                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                          <p className="font-bold text-blue-900 flex items-center gap-2">
                                              <i className="fas fa-user text-sm"></i>
                                              {getRequesterName(selectedOS)}
                                          </p>
                                      </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</p>
                                      {canEditPriority && isEditable(selectedOS) ? (
                                        <div className="relative">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowPriorityDropdown(!showPriorityDropdown);
                                            }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm border-2 transition-all hover:scale-105 ${
                                              selectedOS.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-300' :
                                              selectedOS.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                                              selectedOS.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                              'bg-slate-50 text-slate-700 border-slate-300'
                                            }`}
                                          >
                                            {translatePriority(selectedOS.priority)}
                                            <i className="fas fa-chevron-down text-xs"></i>
                                          </button>
                                          {showPriorityDropdown && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                              <button
                                                onClick={() => handlePriorityChange('CRITICAL')}
                                                className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-red-50 text-red-700 border-b border-slate-100 flex items-center gap-2"
                                              >
                                                <i className="fas fa-exclamation-triangle"></i>
                                                Crítica
                                              </button>
                                              <button
                                                onClick={() => handlePriorityChange('HIGH')}
                                                className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-orange-50 text-orange-700 border-b border-slate-100 flex items-center gap-2"
                                              >
                                                <i className="fas fa-arrow-up"></i>
                                                Alta
                                              </button>
                                              <button
                                                onClick={() => handlePriorityChange('MEDIUM')}
                                                className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-blue-50 text-blue-700 border-b border-slate-100 flex items-center gap-2"
                                              >
                                                <i className="fas fa-minus"></i>
                                                Média
                                              </button>
                                              <button
                                                onClick={() => handlePriorityChange('LOW')}
                                                className="w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                              >
                                                <i className="fas fa-arrow-down"></i>
                                                Baixa
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className={`inline-flex px-3 py-1.5 rounded-lg font-bold text-sm border ${
                                          selectedOS.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                                          selectedOS.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                          selectedOS.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          'bg-slate-50 text-slate-700 border-slate-200'
                                        }`}>
                                          {translatePriority(selectedOS.priority)}
                                        </span>
                                      )}
                                    </div>
                                    <div><p className="text-xs font-bold text-slate-500 uppercase mb-1">Tipo</p><span className="font-bold text-slate-800">{selectedOS.type}</span></div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Executores {!canEditExecutors && <i className="fas fa-lock text-amber-600 ml-1" title="Você não tem permissão para alterar executores"></i>}</p>
                                    {canEditExecutors && isEditable(selectedOS) ? (
                                        <div className="space-y-2">
                                            <div className="max-h-32 overflow-y-auto custom-scrollbar bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                {executors.map(executor => {
                                                    const currentExecutorIds = selectedOS.executorIds || (selectedOS.executorId ? [selectedOS.executorId] : []);
                                                    const isSelected = currentExecutorIds.includes(executor.id);
                                                    return (
                                                        <label key={executor.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 text-clean-primary focus:ring-clean-primary rounded"
                                                                checked={isSelected}
                                                                onChange={async (e) => {
                                                                    let newExecutorIds: string[];
                                                                    if (e.target.checked) {
                                                                        newExecutorIds = [...currentExecutorIds, executor.id];
                                                                    } else {
                                                                        newExecutorIds = currentExecutorIds.filter(id => id !== executor.id);
                                                                    }
                                                                    const updatedOS = { ...selectedOS, executorIds: newExecutorIds.length > 0 ? newExecutorIds : undefined, executorId: undefined };
                                                                    setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
                                                                    setSelectedOS(updatedOS);
                                                                    try {
                                                                        const { error } = await supabase.from('oss').upsert(mapToSupabase(updatedOS));
                                                                        if (error) throw error;
                                                                    } catch (e) {
                                                                        console.error('Erro ao atualizar executores:', e);
                                                                    }
                                                                }}
                                                            />
                                                            <span className="text-sm font-bold text-slate-700">{executor.name}</span>
                                                        </label>
                                                    );
                                                })}
                                                {executors.length === 0 && (
                                                    <p className="text-xs text-slate-400 italic text-center py-2">Nenhum executor cadastrado</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {(() => {
                                                const currentExecutorIds = selectedOS.executorIds || (selectedOS.executorId ? [selectedOS.executorId] : []);
                                                const selectedExecs = users.filter(u => currentExecutorIds.includes(u.id));
                                                return selectedExecs.length > 0 ? (
                                                    selectedExecs.map(exec => (
                                                        <div key={exec.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">{exec.avatar}</div>
                                                            <span className="font-bold text-slate-800 text-sm">{exec.name}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 italic text-sm">Não Atribuído</span>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                                <div className="pt-6 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">Cronograma</p>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between"><span className="text-slate-500">Abertura:</span><span className="font-mono font-bold text-slate-700">{new Date(selectedOS.openDate).toLocaleDateString()}</span></div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">SLA (Horas):</span>
                                            {canEditSLA && isEditable(selectedOS) ? (
                                                isEditingSLA ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-20 h-8 px-2 border-2 border-blue-300 rounded-lg text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                            value={editingSLAValue}
                                                            onChange={e => setEditingSLAValue(Number(e.target.value))}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleSLAChange}
                                                            className="w-7 h-7 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center justify-center"
                                                        >
                                                            <i className="fas fa-check text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => setIsEditingSLA(false)}
                                                            className="w-7 h-7 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all flex items-center justify-center"
                                                        >
                                                            <i className="fas fa-times text-xs"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingSLAValue(selectedOS.slaHours);
                                                            setIsEditingSLA(true);
                                                        }}
                                                        className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-all border-2 border-transparent hover:border-blue-300"
                                                    >
                                                        {selectedOS.slaHours}h <i className="fas fa-edit text-xs ml-1"></i>
                                                    </button>
                                                )
                                            ) : (
                                                <span className="font-mono font-bold text-blue-600">{selectedOS.slaHours}h</span>
                                            )}
                                        </div>

                                        <div className="flex justify-between"><span className="text-slate-500">Prazo Limite:</span><span className="font-mono font-bold text-red-600">{new Date(selectedOS.limitDate).toLocaleDateString()}</span></div>
                                        {selectedOS.startTime && <div className="flex justify-between"><span className="text-slate-500">Início Real:</span><span className="font-mono font-bold text-blue-600">{new Date(selectedOS.startTime).toLocaleString()}</span></div>}
                                        {selectedOS.endTime && <div className="flex justify-between"><span className="text-slate-500">Conclusão:</span><span className="font-mono font-bold text-emerald-600">{new Date(selectedOS.endTime).toLocaleString()}</span></div>}
                                    </div>
                                </div>

                                {(currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') && (
                                  <div className="pt-6 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                      <i className="fas fa-dollar-sign"></i>
                                      Valores Manuais
                                    </p>
                                    <div className="space-y-3">
                                      <div>
                                        
<label className="text-xs font-semibold text-slate-600 mb-1 block">
  Custo de Materiais e Serviços
</label>

<div className="space-y-2">
  {(selectedOS?.costItems || []).map((item: any) => (
    <div key={item.id} className="flex flex-wrap items-center gap-2">
      <select
        className="h-9 px-2 border border-slate-200 rounded-lg text-xs font-bold"
        value={item.type}
        onChange={(e) => updateCostItem(item.id, { type: (e.target as HTMLSelectElement).value })}
      >
        <option value="MATERIAL">Material</option>
        <option value="SERVICE">Serviço</option>
      </select>

      <input
        className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
        placeholder="Material/Serviço"
        value={item.description}
        onChange={(e) => updateCostItem(item.id, { description: (e.target as HTMLInputElement).value })}
      />

      <input
        type="number"
        step="0.01"
        min="0"
        aria-label="Valor"
        title="Valor (R$)"
        className="w-32 min-w-[120px] h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right"
        placeholder="Valor (R$)"
        value={item.amount}
        onChange={(e) => updateCostItem(item.id, { amount: Number((e.target as HTMLInputElement).value) })}
      />

      <button
        type="button"
        onClick={() => removeCostItem(item.id)}
        className="h-9 px-3 rounded-lg text-xs font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 whitespace-nowrap"
        title="Remover item"
      >
        Remover
      </button>
    </div>
  ))}

  <button
    type="button"
    onClick={addCostItem}
    className="text-xs font-bold text-clean-primary hover:underline"
  >
    + Adicionar item
  </button>
</div>

                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-slate-500">R$</span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:border-clean-primary transition-all"
                                            placeholder="Deixe vazio para calcular automaticamente"
                                            value={selectedOS.manualServiceCost !== undefined && selectedOS.manualServiceCost !== null ? selectedOS.manualServiceCost : ''}
                                            onChange={async (e) => {
                                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                                              const updatedOS = { ...selectedOS, manualServiceCost: value };
                                              setOss(prev => prev.map(o => o.id === selectedOS.id ? updatedOS : o));
                                              setSelectedOS(updatedOS);
                                              try {
                                                const { error } = await supabase.from('oss').upsert(mapToSupabase(updatedOS));
                                                if (error) throw error;
                                              } catch (e) {
                                                console.error('Erro ao atualizar valor manual:', e);
                                              }
                                            }}
                                          />
                                        </div>
                                        {selectedOS.manualServiceCost !== undefined && selectedOS.manualServiceCost !== null && (
                                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <i className="fas fa-info-circle"></i>
                                            Valor manual ativo
                                          </p>
                                        )}
                                      </div>
                                      <div className="pt-2 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm font-bold text-slate-700">Custo Total:</span>
                                          <span className="text-lg font-bold text-clean-primary">
                                            R$ {formatCurrency(calculateOSCosts(selectedOS, materials, services).totalCost)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: RESOURCES & CHECKLIST */}
                        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
                            <div className="flex border-b border-slate-200 bg-white px-6 gap-6 shrink-0">
                                <button onClick={() => setActiveSubTab('services')} className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'services' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500'}`}><i className="fas fa-tools"></i> Serviços & Mão de Obra</button>
                                <button onClick={() => setActiveSubTab('materials')} className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeSubTab === 'materials' ? 'border-clean-primary text-clean-primary' : 'border-transparent text-slate-500'}`}><i className="fas fa-boxes"></i> Materiais & Peças</button>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                {/* Autocomplete Input Area */}
                                {isEditable(selectedOS) && (
                                    <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Adicionar {activeSubTab === 'services' ? 'Serviço' : 'Material'}</h5>
                                        <div className="flex gap-3 relative">
                                            <div className="flex-1 relative">
                                                <input 
                                                    type="text" 
                                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:border-clean-primary transition-all"
                                                    placeholder={activeSubTab === 'services' ? 'Buscar serviço...' : 'Buscar material...'}
                                                    value={itemSearchTerm}
                                                    onChange={(e) => { setItemSearchTerm(e.target.value); setNewItem(prev => ({ ...prev, id: '' })); setShowDetailSuggestions(true); }}
                                                    onFocus={() => setShowDetailSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowDetailSuggestions(false), 200)}
                                                />
                                                {showDetailSuggestions && itemSearchTerm && (
                                                    <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1 custom-scrollbar">
                                                        {filteredDetailItems.map(item => (
                                                            <li 
                                                                key={item.id} 
                                                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                                                onClick={() => { setNewItem({ ...newItem, id: item.id, cost: (item as any).unitCost || (item as any).unitValue }); setItemSearchTerm((item as any).description || (item as any).name); setShowDetailSuggestions(false); }}
                                                            >
                                                                <div className="font-bold text-slate-700">{(item as any).description || (item as any).name}</div>
                                                                <div className="text-xs text-slate-500">{(item as any).code || (item as any).team}</div>
                                                            </li>
                                                        ))}
                                                        {filteredDetailItems.length === 0 && <li className="px-3 py-2 text-slate-400 italic text-xs">Nenhum item encontrado.</li>}
                                                    </ul>
                                                )}
                                            </div>
                                            <div className="w-24">
                                                <input type="number" min="0.1" placeholder="Qtd" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: Number(e.target.value) })} />
                                            </div>
                                            <button onClick={handleAddItemToOS} className="h-10 px-5 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900 transition-colors">Adicionar</button>
                                        </div>
                                    </div>
                                )}

                                {/* List of Items */}
                                <div className="space-y-6">
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                                                <tr className="border-b border-slate-100">
                                                    <th className="p-4">Item</th>
                                                    {activeSubTab === 'materials' && <th className="p-4">Local</th>}
                                                    <th className="p-4 text-right">Qtd</th>
                                                    <th className="p-4 text-right">Custo Unit.</th>
                                                    <th className="p-4 text-right">Total</th>
                                                    <th className="p-4 text-center w-20">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {activeSubTab === 'services' ? (
                                                    selectedOS.services.map((s, i) => {
                                                        const srv = services.find(x => x.id === s.serviceTypeId);
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50">
                                                                <td className="p-4 font-bold text-slate-700">{srv?.name || 'Item Excluído'}</td>
                                                                <td className="p-4 text-right font-mono">{s.quantity} h</td>
                                                                <td className="p-4 text-right text-slate-600">R$ {formatCurrency(s.unitCost)}</td>
                                                                <td className="p-4 text-right font-bold text-slate-800">R$ {formatCurrency(s.quantity * s.unitCost)}</td>
                                                                <td className="p-4 text-center"><button onClick={() => handleRemoveService(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Remover serviço"><i className="fas fa-trash-alt"></i></button></td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    selectedOS.materials.map((m, i) => {
                                                        const mat = materials.find(x => x.id === m.materialId);
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50">
                                                                <td className="p-4 font-bold text-slate-700">{mat?.description || 'Item Excluído'}</td>
                                                                <td className="p-4 text-slate-600">
                                                                    {m.fromLocation ? (
                                                                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                                                                            {m.fromLocation}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-xs italic">Não especificado</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 text-right font-mono">{m.quantity} {mat?.unit}</td>
                                                                <td className="p-4 text-right text-slate-600">R$ {formatCurrency(m.unitCost)}</td>
                                                                <td className="p-4 text-right font-bold text-slate-800">R$ {formatCurrency(m.quantity * m.unitCost)}</td>
                                                                <td className="p-4 text-center"><button onClick={() => handleRemoveMaterial(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Remover material"><i className="fas fa-trash-alt"></i></button></td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                                {((activeSubTab === 'services' && selectedOS.services.length === 0) || (activeSubTab === 'materials' && selectedOS.materials.length === 0)) && (
                                                    <tr><td colSpan={activeSubTab === 'materials' ? 6 : 5} className="p-8 text-center text-slate-400 italic">Nenhum item registrado nesta categoria.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Baixas do Almoxarifado - Only for Materials Tab */}
                                    {activeSubTab === 'materials' && (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                                                <h5 className="text-xs font-bold text-amber-900 uppercase flex items-center gap-2">
                                                    <i className="fas fa-truck-ramp-box"></i> Baixas do Almoxarifado
                                                </h5>
                                            </div>
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                                                    <tr className="border-b border-slate-100">
                                                        <th className="p-4">Data</th>
                                                        <th className="p-4">Material</th>
                                                        <th className="p-4 text-right">Qtd</th>
                                                        <th className="p-4">Local Origem</th>
                                                        <th className="p-4">Usuario</th>
                                                        <th className="p-4">Descricao</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {movements.filter(mov => mov.osId === selectedOS.number && mov.type === 'OUT').map(mov => {
                                                        const mat = materials.find(m => m.id === mov.materialId);
                                                        return (
                                                            <tr key={mov.id} className="hover:bg-slate-50">
                                                                <td className="p-4 text-slate-600 font-mono text-xs">{new Date(mov.date).toLocaleString('pt-BR')}</td>
                                                                <td className="p-4 font-bold text-slate-700">{mat?.description || 'Item Excluido'}</td>
                                                                <td className="p-4 text-right font-mono font-bold text-lg">{mov.quantity} <span className="text-xs text-slate-400">{mat?.unit}</span></td>
                                                                <td className="p-4 text-slate-600 text-sm">{mov.fromLocation || '-'}</td>
                                                                <td className="p-4 text-slate-600 text-sm">{mov.userId}</td>
                                                                <td className="p-4 text-slate-500 text-sm">{mov.description}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {movements.filter(mov => mov.osId === selectedOS.number && mov.type === 'OUT').length === 0 && (
                                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nenhuma baixa de almoxarifado registrada para esta OS.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
        </ModalPortal>
      )}

      {/* NEW OS MODAL */}
      {showModal && (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                <div className="relative w-full max-w-6xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div><h3 className="font-bold text-xl text-slate-800">Nova Ordem de Serviço</h3><p className="text-sm text-slate-500 mt-1">Abertura de chamado técnico.</p></div>
                    <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"><i className="fas fa-times"></i></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 min-h-0">
                    <form id="osForm" onSubmit={handleCreate} className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* LEFT COLUMN */}
                            <div className="space-y-6">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Vínculo da OS (Centro de Custo)</label>
                                <div className="flex gap-2 mb-4">
                                    <button type="button" onClick={() => { setCreationContext('PROJECT'); setEquipmentCompanyFilter(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${creationContext === 'PROJECT' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><i className="fas fa-folder-tree mr-2"></i> Projeto</button>
                                    <button type="button" onClick={() => { setCreationContext('BUILDING'); setEquipmentCompanyFilter(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${creationContext === 'BUILDING' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><i className="fas fa-building mr-2"></i> Edifício</button>
                                    <button type="button" onClick={() => setCreationContext('EQUIPMENT')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${creationContext === 'EQUIPMENT' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><i className="fas fa-cogs mr-2"></i> Equip</button>
                                </div>
                                {creationContext === 'PROJECT' ? (
                                    <select required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800" value={formOS.projectId || ''} onChange={e => setFormOS({...formOS, projectId: e.target.value, buildingId: undefined, equipmentId: undefined})}><option value="">Selecione o Projeto...</option>{projects.filter(p => p.status !== 'FINISHED').map(p => <option key={p.id} value={p.id}>{p.code} - {p.description}</option>)}</select>
                                ) : creationContext === 'BUILDING' ? (
                                    <select required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800" value={formOS.buildingId || ''} onChange={e => setFormOS({...formOS, buildingId: e.target.value, projectId: undefined, equipmentId: undefined})}><option value="">Selecione o Edifício...</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.city})</option>)}</select>
                                ) : (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Filtrar por Empresa</label>
                                        <select
                                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700"
                                          value={equipmentCompanyFilter}
                                          onChange={e => setEquipmentCompanyFilter(e.target.value)}
                                        >
                                          <option value="">Todas as empresas</option>
                                          {uniqueEquipmentCompanies.map(company => (
                                            <option key={company} value={company}>{company}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <select required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800" value={formOS.equipmentId || ''} onChange={e => setFormOS({...formOS, equipmentId: e.target.value, projectId: undefined, buildingId: undefined})}><option value="">Selecione o Equipamento...</option>{filteredEquipments.map(e => <option key={e.id} value={e.id}>{e.name} - {e.code} ({e.location})</option>)}</select>
                                    </div>
                                )}
                                {creationContext !== 'PROJECT' && (
                                    <div className="mt-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Centro de Custo</label>
                                        <input required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800" placeholder="Ex: CC-001, MANUT-2024" value={formOS.costCenter || ''} onChange={e => setFormOS({...formOS, costCenter: e.target.value})} />
                                        <p className="text-xs text-slate-500 mt-1.5 ml-1">Quando vinculado a Projeto, o centro de custo é herdado do Projeto.</p>
                                    </div>
                                )}
                                </div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Descrição</label><textarea required className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium h-24" value={formOS.description} onChange={e => setFormOS({...formOS, description: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-6">
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tipo</label><select className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold" value={formOS.type} onChange={e => setFormOS({...formOS, type: e.target.value as any})}>{Object.values(OSType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                    Prioridade
                                    {currentUser.role !== 'ADMIN' && (
                                      <span className="text-amber-600" title="Apenas administradores podem definir prioridade">
                                        <i className="fas fa-lock text-xs"></i>
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    value={formOS.priority}
                                    onChange={e => setFormOS({...formOS, priority: e.target.value as any})}
                                    disabled={currentUser.role !== 'ADMIN'}
                                  >
                                    <option value="LOW">Baixa</option>
                                    <option value="MEDIUM">Média</option>
                                    <option value="HIGH">Alta</option>
                                    <option value="CRITICAL">Crítica</option>
                                  </select>
                                </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                    SLA (Horas)
                                    {currentUser.role !== 'ADMIN' && (
                                      <span className="text-amber-600" title="Apenas administradores podem definir o SLA">
                                        <i className="fas fa-lock text-xs"></i>
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    value={formOS.slaHours}
                                    onChange={e => setFormOS({...formOS, slaHours: Number(e.target.value)})}
                                    disabled={currentUser.role !== 'ADMIN'}
                                  />
                                </div>
                                {currentUser.role === 'ADMIN' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center justify-between">
                                        <span>Executores</span>
                                        <button type="button" onClick={() => setShowExecutorModal(true)} className="text-clean-primary hover:text-clean-primary/80 text-xs flex items-center gap-1">
                                            <i className="fas fa-user-plus"></i> Novo
                                        </button>
                                    </label>
                                    <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar">
                                        {executors.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {executors.map(executor => (
                                                    <label key={executor.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-clean-primary focus:ring-clean-primary rounded"
                                                            checked={selectedExecutors.includes(executor.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedExecutors([...selectedExecutors, executor.id]);
                                                                } else {
                                                                    setSelectedExecutors(selectedExecutors.filter(id => id !== executor.id));
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-sm font-bold text-slate-700">{executor.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic text-center py-2">Nenhum executor cadastrado</p>
                                        )}
                                    </div>
                                    {selectedExecutors.length > 0 && (
                                        <p className="text-xs text-emerald-600 font-bold mt-1.5 ml-1">
                                            {selectedExecutors.length} executor(es) selecionado(s)
                                        </p>
                                    )}
                                </div>
                                )}
                                {currentUser.role !== 'ADMIN' && (
                                <div className="col-span-1 flex items-center justify-center bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs text-amber-700 font-bold flex items-center gap-2"><i className="fas fa-info-circle"></i> Executores serão definidos pelo administrador</p></div>
                                )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: ALLOCATION (Simplified View with Autocomplete) */}
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><i className="fas fa-boxes-stacked text-clean-primary"></i> Alocação de Recursos</h4>
                                    
                                    {/* Materials Autocomplete */}
                                    <div className="mb-6 flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Materiais</label>
                                        <div className="relative mb-2">
                                            <input type="text" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white" placeholder="Buscar Material..." value={allocMatSearch} onChange={(e) => { setAllocMatSearch(e.target.value); setAllocMatId(''); setShowAllocMatSuggestions(true); }} onFocus={() => setShowAllocMatSuggestions(true)} onBlur={() => setTimeout(() => setShowAllocMatSuggestions(false), 200)} />
                                            {showAllocMatSuggestions && (
                                                <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1 custom-scrollbar">
                                                    {filteredMaterialsForAlloc.map(m => ( <li key={m.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50" onClick={() => { setAllocMatId(m.id); setAllocMatSearch(m.description); setShowAllocMatSuggestions(false); }}><div className="font-bold">{m.description}</div><div className="text-xs text-slate-500">Estoque: {m.currentStock}</div></li> ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mb-2"><input type="number" placeholder="Qtd" className="w-24 h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={allocMatQty} onChange={e => setAllocMatQty(e.target.value)} /><button type="button" onClick={() => setShowQuickMatModal(true)} className="w-10 h-10 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg"><i className="fas fa-magic"></i></button><button type="button" onClick={addAllocMaterial} className="flex-1 bg-slate-800 text-white rounded-lg font-bold text-sm">Adicionar</button></div>
                                        <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar bg-slate-50 p-2 rounded-lg border border-slate-100">{plannedMaterials.map((pm, idx) => { const m = materials.find(x => x.id === pm.materialId); return (<div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200"><span className="truncate flex-1 font-bold">{m?.description}</span><span className="font-bold ml-2 bg-slate-100 px-2 py-0.5 rounded">{pm.quantity}</span><button type="button" onClick={() => setPlannedMaterials(plannedMaterials.filter((_, i) => i !== idx))} className="ml-2 text-red-400"><i className="fas fa-times"></i></button></div>); })}</div>
                                    </div>

                                    {/* Services Autocomplete */}
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Serviços</label>
                                        <div className="relative mb-2">
                                            <input type="text" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white" placeholder="Buscar Serviço..." value={allocSrvSearch} onChange={(e) => { setAllocSrvSearch(e.target.value); setAllocSrvId(''); setShowAllocSrvSuggestions(true); }} onFocus={() => setShowAllocSrvSuggestions(true)} onBlur={() => setTimeout(() => setShowAllocSrvSuggestions(false), 200)} />
                                            {showAllocSrvSuggestions && (
                                                <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1 custom-scrollbar top-full">
                                                    {filteredServicesForAlloc.map(s => ( <li key={s.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50" onClick={() => { setAllocSrvId(s.id); setAllocSrvSearch(s.name); setShowAllocSrvSuggestions(false); }}><div className="font-bold">{s.name}</div></li> ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mb-2"><input type="number" placeholder="Hrs" className="w-24 h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={allocSrvQty} onChange={e => setAllocSrvQty(e.target.value)} /><button type="button" onClick={addAllocService} className="flex-1 bg-slate-800 text-white rounded-lg font-bold text-sm">Adicionar</button></div>
                                        <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar bg-slate-50 p-2 rounded-lg border border-slate-100">{plannedServices.map((ps, idx) => { const s = services.find(x => x.id === ps.serviceTypeId); return (<div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200"><span className="truncate flex-1 font-bold">{s?.name}</span><span className="font-bold ml-2 bg-slate-100 px-2 py-0.5 rounded">{ps.quantity}h</span><button type="button" onClick={() => setPlannedServices(plannedServices.filter((_, i) => i !== idx))} className="ml-2 text-red-400"><i className="fas fa-times"></i></button></div>); })}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                    </div>
                    <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0"><button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button><button type="submit" form="osForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg transition-all">Abrir OS</button></div>
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

      {/* NEW EXECUTOR MODAL */}
      {showExecutorModal && (
        <ModalPortal>
            <div className="fixed inset-0 z-[10000]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" onClick={() => setShowExecutorModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                <div className="relative w-full max-w-md my-8 bg-white rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                    <h3 className="font-bold text-lg text-slate-900 mb-4">Novo Executor</h3>
                    <form onSubmit={handleCreateExecutor} className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label><input required className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium" value={newExecutorData.name} onChange={e => setNewExecutorData({...newExecutorData, name: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input required type="email" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium" value={newExecutorData.email} onChange={e => setNewExecutorData({...newExecutorData, email: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label><input className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium" value={newExecutorData.department} onChange={e => setNewExecutorData({...newExecutorData, department: e.target.value})} /></div>
                        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowExecutorModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-bold bg-clean-primary text-white rounded-lg hover:bg-clean-primary/90">Salvar</button></div>
                    </form>
                </div>
              </div>
            </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default OSList;
