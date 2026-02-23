import React, { useState, useEffect, useRef } from 'react';
import {
  Project, OS, Material, ServiceType, StockMovement,
  UserRole, OSStatus, ProjectStatus, User, PurchaseRecord, Building, StockLocation, Equipment
} from './types';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import OSList from './components/OSList';
import Inventory from './components/Inventory';
import ServiceManager from './components/ServiceManager';
import SupplierManager from './components/SupplierManager';
import Documentation from './components/Documentation';
import CalendarView from './components/CalendarView';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import ExecutorPanel from './components/ExecutorPanel';
import BuildingManager from './components/BuildingManager';
import EquipmentManager from './components/EquipmentManager';
import Reports from './components/Reports';
import { supabase, mapFromSupabase, mapToSupabase, mapToSupabaseJson } from './services/supabase';
import { canAccessModule, ModuleId, loadCustomPermissions, loadUserPermissions } from './services/permissions';

// Definição da estrutura do Menu
const MENU_GROUPS = [
  {
    title: "Estratégico",
    items: [
      { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
      { id: 'projects', icon: 'fa-folder-tree', label: 'Projetos (Capex)' },
      { id: 'reports', icon: 'fa-file-invoice', label: 'Relatórios' },
      { id: 'os', icon: 'fa-screwdriver-wrench', label: 'Ordens de Serviço' }
    ]
  },
  {
    title: "Operacional",
    items: [
      { id: 'calendar', icon: 'fa-calendar-days', label: 'Agenda de Serviços' },
      { id: 'buildings', icon: 'fa-building', label: 'Edifícios' },
      { id: 'equipments', icon: 'fa-cogs', label: 'Equipamentos' },
      { id: 'inventory', icon: 'fa-warehouse', label: 'Almoxarifado' },
      { id: 'services', icon: 'fa-users-gear', label: 'Serviços' },
      { id: 'suppliers', icon: 'fa-handshake', label: 'Fornecedores' }
    ]
  },
  {
    title: "Sistema",
    items: [
      { id: 'users', icon: 'fa-users', label: 'Usuários' },
      { id: 'documentation', icon: 'fa-book-open', label: 'Documentação' }
    ]
  }
] as const;

type TabId = typeof MENU_GROUPS[number]['items'][number]['id'];

const App: React.FC = () => {
  // Estado de Autenticação
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('dash');
  
  // Dados do Sistema (Sempre vazio no início - carregados do Supabase)
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [oss, setOss] = useState<OS[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  
  // Estado de Layout Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estado de Sincronização
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'offline' | 'error'>('online');
  const [firstLoad, setFirstLoad] = useState(true);

  // Refs para debounce de salvamento
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Busca paginada para evitar limites do PostgREST/Supabase (ex: Max Rows)
  // Mantém o comportamento atual (mesmas colunas/ordenação), apenas garantindo que traga TUDO.
  const fetchAllRows = async <T,>(
    table: string,
    options?: {
      select?: string;
      orderBy?: string;
      ascending?: boolean;
      pageSize?: number;
    }
  ): Promise<T[]> => {
    const select = options?.select ?? '*';
    const orderBy = options?.orderBy ?? 'updated_at';
    const ascending = options?.ascending ?? false;
    const pageSize = Math.min(Math.max(options?.pageSize ?? 1000, 1), 5000);

    const all: T[] = [];
    let from = 0;

    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .order(orderBy, { ascending })
        .range(from, to);

      if (error) throw error;

      const batch = (data || []) as T[];
      all.push(...batch);

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    return all;
  };

  // Carregamento Inicial do Supabase (Única Fonte de Dados)
  useEffect(() => {
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        console.log('🚀 Starting data load from Supabase...');
        await loadCustomPermissions();
        await loadUserPermissions();

        // OBS: materials (almoxarifado) é o único que tende a estourar limites de paginação.
        // Por isso ele é carregado em paginação dedicada logo abaixo.
        const [p, s, o, mov, sup, usr, pur, bld, eqp] = await Promise.all([
          supabase.from('projects').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('services').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('oss').select('*', { count: 'exact' }).order('open_date', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('stock_movements').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('suppliers').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('users').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('purchases').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('buildings').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999),
          supabase.from('equipments').select('*', { count: 'exact' }).order('updated_at', { ascending: false, nullsFirst: false }).range(0, 9999)
        ]);

        const allMaterialsRows = await fetchAllRows<any>('materials', {
          select: '*',
          orderBy: 'code',
          ascending: true,
          pageSize: 1000
        });

        if (p.error) console.error("❌ Error loading projects:", p.error);
        if (s.error) console.error("❌ Error loading services:", s.error);
        if (o.error) console.error("❌ Error loading OSs:", o.error);
        if (mov.error) console.error("❌ Error loading stock_movements:", mov.error);
        if (eqp.error) console.error("❌ Error loading equipments:", eqp.error);
        if (usr.error) console.error("❌ Error loading users:", usr.error);

        if (p.error || s.error || usr.error) {
          console.error("Critical errors found. Check logs above.");
          throw new Error("Erro de conexão com Supabase");
        }

        const mappedMaterials = mapFromSupabase<Material>(allMaterialsRows || []);

        setProjects(mapFromSupabase<Project>(p.data || []));
        setMaterials(mappedMaterials);
        setServices(mapFromSupabase<ServiceType>(s.data || []));
        setOss(mapFromSupabase<OS>(o.data || []));
        setMovements(mapFromSupabase<StockMovement>(mov.data || []));
        setSuppliers(mapFromSupabase<any>(sup.data || []));
        setUsers(mapFromSupabase<User>(usr.data || []));
        setPurchases(mapFromSupabase<PurchaseRecord>(pur.data || []));
        setBuildings(mapFromSupabase<Building>(bld.data || []));
        setEquipments(mapFromSupabase<Equipment>(eqp.data || []));

        setSyncStatus('online');
      } catch (err) {
        console.error("❌ Failed to connect to Supabase:", err);
        setSyncStatus('error');
        alert("Erro ao conectar com o banco de dados. Verifique sua conexão com a internet.");
      } finally {
        setFirstLoad(false);
        const savedUser = localStorage.getItem('crop_user_session');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
      }
    };

    loadData();
  }, []);


  // Função para gerenciar baixa de estoque via OS
  // Agora suporta múltiplos locais (FIFO de locais: consome do primeiro com saldo)
  const handleStockChange = async (mId: string, qty: number, osNumber: string) => {
    let updatedMaterial: Material | null = null;
    let newMovement: StockMovement | null = null;

    try {
      // Buscar material atual no state (fonte oficial no front)
      const material = materials.find(m => m.id === mId);
      if (!material) {
        alert("Material não encontrado.");
        return;
      }

      // Normaliza locais (compatibilidade: caso não exista stock_locations)
      const stockLocations: StockLocation[] = Array.isArray(material.stock_locations)
        ? material.stock_locations
        : [];

      // Se não tiver locais, mantém comportamento antigo (current_stock)
      if (!stockLocations.length) {
        const newStock = (material.current_stock || 0) - qty;
        if (newStock < 0) {
          alert("Estoque insuficiente.");
          return;
        }

        updatedMaterial = {
          ...material,
          current_stock: newStock
        };

        const movement: StockMovement = {
          id: crypto.randomUUID(),
          material_id: mId,
          movement_type: 'saida_os',
          quantity: qty,
          date: new Date().toISOString(),
          responsible: currentUser?.name || 'Sistema',
          os_number: osNumber
        };

        newMovement = movement;

        // Salvar em materiais
        const { error: matErr } = await supabase
          .from('materials')
          .update(mapToSupabase(updatedMaterial))
          .eq('id', mId);

        if (matErr) throw matErr;

        // Salvar movimento
        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert(mapToSupabase(newMovement));

        if (movErr) throw movErr;

        // Atualizar state
        setMaterials(prev => prev.map(m => (m.id === mId ? updatedMaterial! : m)));
        setMovements(prev => [newMovement!, ...prev]);
        return;
      }

      // FIFO: consumir dos locais com saldo
      let remaining = qty;
      const updatedLocations = stockLocations.map(loc => ({ ...loc }));

      for (const loc of updatedLocations) {
        if (remaining <= 0) break;
        const available = loc.quantity || 0;
        if (available <= 0) continue;

        const take = Math.min(available, remaining);
        loc.quantity = available - take;
        remaining -= take;
      }

      if (remaining > 0) {
        alert("Estoque insuficiente (considerando os locais).");
        return;
      }

      // Atualiza total (current_stock) como soma dos locais
      const newTotal = updatedLocations.reduce((sum, l) => sum + (l.quantity || 0), 0);

      updatedMaterial = {
        ...material,
        stock_locations: updatedLocations,
        current_stock: newTotal
      };

      const movement: StockMovement = {
        id: crypto.randomUUID(),
        material_id: mId,
        movement_type: 'saida_os',
        quantity: qty,
        date: new Date().toISOString(),
        responsible: currentUser?.name || 'Sistema',
        os_number: osNumber
      };

      newMovement = movement;

      // Salvar em materiais (json)
      const { error: matErr } = await supabase
        .from('materials')
        .update(mapToSupabaseJson(updatedMaterial, ['stock_locations']))
        .eq('id', mId);

      if (matErr) throw matErr;

      // Salvar movimento
      const { error: movErr } = await supabase
        .from('stock_movements')
        .insert(mapToSupabase(newMovement));

      if (movErr) throw movErr;

      // Atualizar state
      setMaterials(prev => prev.map(m => (m.id === mId ? updatedMaterial! : m)));
      setMovements(prev => [newMovement!, ...prev]);
    } catch (err) {
      console.error("Erro ao dar baixa no estoque:", err);
      alert("Erro ao dar baixa no estoque. Verifique logs.");
    }
  };

  // Função de login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('crop_user_session', JSON.stringify(user));
  };

  // Função de logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('crop_user_session');
  };

  // Funções de salvamento (debounce)
  const debounceSave = (fn: () => Promise<void>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fn().catch(err => console.error("Erro ao salvar:", err));
    }, 500);
  };

  // CRUD Projects
  const addProject = (project: Project) => {
    const newProject = { ...project, id: crypto.randomUUID(), updated_at: new Date().toISOString() };
    setProjects(prev => [newProject, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('projects').insert(mapToSupabase(newProject));
      if (error) {
        console.error("Erro ao adicionar projeto:", error);
        alert("Erro ao salvar projeto.");
      }
    });
  };

  const updateProject = (project: Project) => {
    const updated = { ...project, updated_at: new Date().toISOString() };
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    debounceSave(async () => {
      const { error } = await supabase.from('projects').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar projeto:", error);
        alert("Erro ao atualizar projeto.");
      }
    });
  };

  const deleteProject = (id: string) => {
    if (!confirm("Excluir projeto?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir projeto:", error);
        alert("Erro ao excluir projeto.");
      }
    });
  };

  // CRUD OS
  const addOS = (os: OS) => {
    const newOS: OS = {
      ...os,
      id: crypto.randomUUID(),
      open_date: os.open_date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setOss(prev => [newOS, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('oss').insert(mapToSupabase(newOS));
      if (error) {
        console.error("Erro ao adicionar OS:", error);
        alert("Erro ao salvar OS.");
      }
    });
  };

  const updateOS = (os: OS) => {
    const updated = { ...os, updated_at: new Date().toISOString() };
    setOss(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    debounceSave(async () => {
      const { error } = await supabase.from('oss').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar OS:", error);
        alert("Erro ao atualizar OS.");
      }
    });
  };

  const deleteOS = (id: string) => {
    if (!confirm("Excluir OS?")) return;
    setOss(prev => prev.filter(o => o.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('oss').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir OS:", error);
        alert("Erro ao excluir OS.");
      }
    });
  };

  // CRUD Materials
  const addMaterial = (material: Material) => {
    const newMaterial: Material = {
      ...material,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };
    setMaterials(prev => [newMaterial, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('materials').insert(mapToSupabase(newMaterial));
      if (error) {
        console.error("Erro ao adicionar material:", error);
        alert("Erro ao salvar material.");
      }
    });
  };

  const updateMaterial = (material: Material) => {
    const updated = { ...material, updated_at: new Date().toISOString() };
    setMaterials(prev => prev.map(m => (m.id === updated.id ? updated : m)));
    debounceSave(async () => {
      const { error } = await supabase.from('materials').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar material:", error);
        alert("Erro ao atualizar material.");
      }
    });
  };

  const deleteMaterial = (id: string) => {
    if (!confirm("Excluir material?")) return;
    setMaterials(prev => prev.filter(m => m.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir material:", error);
        alert("Erro ao excluir material.");
      }
    });
  };

  // CRUD Services
  const addServiceType = (service: ServiceType) => {
    const newService: ServiceType = {
      ...service,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };
    setServices(prev => [newService, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('services').insert(mapToSupabase(newService));
      if (error) {
        console.error("Erro ao adicionar serviço:", error);
        alert("Erro ao salvar serviço.");
      }
    });
  };

  const updateServiceType = (service: ServiceType) => {
    const updated = { ...service, updated_at: new Date().toISOString() };
    setServices(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    debounceSave(async () => {
      const { error } = await supabase.from('services').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar serviço:", error);
        alert("Erro ao atualizar serviço.");
      }
    });
  };

  const deleteServiceType = (id: string) => {
    if (!confirm("Excluir serviço?")) return;
    setServices(prev => prev.filter(s => s.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir serviço:", error);
        alert("Erro ao excluir serviço.");
      }
    });
  };

  // CRUD Suppliers
  const addSupplier = (supplier: any) => {
    const newSupplier = { ...supplier, id: crypto.randomUUID(), updated_at: new Date().toISOString() };
    setSuppliers(prev => [newSupplier, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('suppliers').insert(mapToSupabase(newSupplier));
      if (error) {
        console.error("Erro ao adicionar fornecedor:", error);
        alert("Erro ao salvar fornecedor.");
      }
    });
  };

  const updateSupplier = (supplier: any) => {
    const updated = { ...supplier, updated_at: new Date().toISOString() };
    setSuppliers(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    debounceSave(async () => {
      const { error } = await supabase.from('suppliers').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar fornecedor:", error);
        alert("Erro ao atualizar fornecedor.");
      }
    });
  };

  const deleteSupplier = (id: string) => {
    if (!confirm("Excluir fornecedor?")) return;
    setSuppliers(prev => prev.filter(s => s.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir fornecedor:", error);
        alert("Erro ao excluir fornecedor.");
      }
    });
  };

  // CRUD Users
  const addUser = (user: User) => {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    };
    setUsers(prev => [newUser, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('users').insert(mapToSupabase(newUser));
      if (error) {
        console.error("Erro ao adicionar usuário:", error);
        alert("Erro ao salvar usuário.");
      }
    });
  };

  const updateUser = (user: User) => {
    const updated = { ...user, updated_at: new Date().toISOString() };
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    debounceSave(async () => {
      const { error } = await supabase.from('users').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar usuário:", error);
        alert("Erro ao atualizar usuário.");
      }
    });
  };

  const deleteUser = (id: string) => {
    if (!confirm("Excluir usuário?")) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir usuário:", error);
        alert("Erro ao excluir usuário.");
      }
    });
  };

  // CRUD Purchases
  const addPurchase = (purchase: PurchaseRecord) => {
    const newPurchase: PurchaseRecord = {
      ...purchase,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('purchases').insert(mapToSupabase(newPurchase));
      if (error) {
        console.error("Erro ao adicionar compra:", error);
        alert("Erro ao salvar compra.");
      }
    });
  };

  const updatePurchase = (purchase: PurchaseRecord) => {
    const updated = { ...purchase, updated_at: new Date().toISOString() };
    setPurchases(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    debounceSave(async () => {
      const { error } = await supabase.from('purchases').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar compra:", error);
        alert("Erro ao atualizar compra.");
      }
    });
  };

  const deletePurchase = (id: string) => {
    if (!confirm("Excluir compra?")) return;
    setPurchases(prev => prev.filter(p => p.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir compra:", error);
        alert("Erro ao excluir compra.");
      }
    });
  };

  // CRUD Buildings
  const addBuilding = (building: Building) => {
    const newBuilding: Building = {
      ...building,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };
    setBuildings(prev => [newBuilding, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('buildings').insert(mapToSupabase(newBuilding));
      if (error) {
        console.error("Erro ao adicionar edifício:", error);
        alert("Erro ao salvar edifício.");
      }
    });
  };

  const updateBuilding = (building: Building) => {
    const updated = { ...building, updated_at: new Date().toISOString() };
    setBuildings(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    debounceSave(async () => {
      const { error } = await supabase.from('buildings').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar edifício:", error);
        alert("Erro ao atualizar edifício.");
      }
    });
  };

  const deleteBuilding = (id: string) => {
    if (!confirm("Excluir edifício?")) return;
    setBuildings(prev => prev.filter(b => b.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('buildings').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir edifício:", error);
        alert("Erro ao excluir edifício.");
      }
    });
  };

  // CRUD Equipments
  const addEquipment = (equipment: Equipment) => {
    const newEquipment: Equipment = {
      ...equipment,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };
    setEquipments(prev => [newEquipment, ...prev]);
    debounceSave(async () => {
      const { error } = await supabase.from('equipments').insert(mapToSupabase(newEquipment));
      if (error) {
        console.error("Erro ao adicionar equipamento:", error);
        alert("Erro ao salvar equipamento.");
      }
    });
  };

  const updateEquipment = (equipment: Equipment) => {
    const updated = { ...equipment, updated_at: new Date().toISOString() };
    setEquipments(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    debounceSave(async () => {
      const { error } = await supabase.from('equipments').update(mapToSupabase(updated)).eq('id', updated.id);
      if (error) {
        console.error("Erro ao atualizar equipamento:", error);
        alert("Erro ao atualizar equipamento.");
      }
    });
  };

  const deleteEquipment = (id: string) => {
    if (!confirm("Excluir equipamento?")) return;
    setEquipments(prev => prev.filter(e => e.id !== id));
    debounceSave(async () => {
      const { error } = await supabase.from('equipments').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir equipamento:", error);
        alert("Erro ao excluir equipamento.");
      }
    });
  };

  const canViewTab = (tabId: TabId): boolean => {
    const moduleMap: Record<TabId, ModuleId> = {
      dashboard: 'dashboard',
      projects: 'projects',
      reports: 'reports',
      os: 'oss',
      calendar: 'calendar',
      buildings: 'buildings',
      equipments: 'equipments',
      inventory: 'inventory',
      services: 'services',
      suppliers: 'suppliers',
      users: 'users',
      documentation: 'documentation',
      dash: 'dashboard' as any
    };

    const moduleId = moduleMap[tabId];
    if (!moduleId) return true;
    return canAccessModule(moduleId);
  };

  // Renderização do conteúdo principal
  const renderContent = () => {
    if (!currentUser) return <Login onLogin={handleLogin} />;

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            projects={projects}
            oss={oss}
            materials={materials}
            purchases={purchases}
            movements={movements}
            equipments={equipments}
          />
        );
      case 'projects':
        return (
          <ProjectList
            projects={projects}
            onAdd={addProject}
            onUpdate={updateProject}
            onDelete={deleteProject}
            currentUser={currentUser}
          />
        );
      case 'reports':
        return (
          <Reports
            projects={projects}
            oss={oss}
            materials={materials}
            movements={movements}
            purchases={purchases}
            equipments={equipments}
            buildings={buildings}
          />
        );
      case 'os':
        return (
          <OSList
            oss={oss}
            projects={projects}
            materials={materials}
            services={services}
            equipments={equipments}
            onAdd={addOS}
            onUpdate={updateOS}
            onDelete={deleteOS}
            onStockChange={handleStockChange}
            currentUser={currentUser}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            oss={oss}
            projects={projects}
            services={services}
            equipments={equipments}
            onUpdateOS={updateOS}
          />
        );
      case 'buildings':
        return (
          <BuildingManager
            buildings={buildings}
            onAdd={addBuilding}
            onUpdate={updateBuilding}
            onDelete={deleteBuilding}
          />
        );
      case 'equipments':
        return (
          <EquipmentManager
            equipments={equipments}
            buildings={buildings}
            onAdd={addEquipment}
            onUpdate={updateEquipment}
            onDelete={deleteEquipment}
          />
        );
      case 'inventory':
        return (
          <Inventory
            materials={materials}
            suppliers={suppliers}
            purchases={purchases}
            movements={movements}
            onAddMaterial={addMaterial}
            onUpdateMaterial={updateMaterial}
            onDeleteMaterial={deleteMaterial}
            onAddPurchase={addPurchase}
            onUpdatePurchase={updatePurchase}
            onDeletePurchase={deletePurchase}
            currentUser={currentUser}
          />
        );
      case 'services':
        return (
          <ServiceManager
            services={services}
            onAdd={addServiceType}
            onUpdate={updateServiceType}
            onDelete={deleteServiceType}
          />
        );
      case 'suppliers':
        return (
          <SupplierManager
            suppliers={suppliers}
            onAdd={addSupplier}
            onUpdate={updateSupplier}
            onDelete={deleteSupplier}
          />
        );
      case 'users':
        return (
          <UserManagement
            users={users}
            onAdd={addUser}
            onUpdate={updateUser}
            onDelete={deleteUser}
            currentUser={currentUser}
          />
        );
      case 'documentation':
        return <Documentation />;
      default:
        return null;
    }
  };

  // Se ainda está carregando pela primeira vez
  if (firstLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-700">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário autenticado
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Abrir menu"
          >
            <i className="fa-solid fa-bars text-xl"></i>
          </button>
          <h1 className="font-bold text-lg">Engenharia & Manutenção</h1>

          <div className="ml-3 flex items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${
                syncStatus === 'online'
                  ? 'bg-green-100 text-green-800'
                  : syncStatus === 'syncing'
                  ? 'bg-yellow-100 text-yellow-800'
                  : syncStatus === 'offline'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-red-100 text-red-800'
              }`}
              title={
                syncStatus === 'online'
                  ? 'Online'
                  : syncStatus === 'syncing'
                  ? 'Sincronizando'
                  : syncStatus === 'offline'
                  ? 'Offline'
                  : 'Erro'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'online'
                    ? 'bg-green-600'
                    : syncStatus === 'syncing'
                    ? 'bg-yellow-600'
                    : syncStatus === 'offline'
                    ? 'bg-gray-500'
                    : 'bg-red-600'
                }`}
              ></span>
              {syncStatus === 'online'
                ? 'Online'
                : syncStatus === 'syncing'
                ? 'Sincronizando'
                : syncStatus === 'offline'
                ? 'Offline'
                : 'Erro'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{currentUser.name}</div>
            <div className="text-xs text-gray-500">{currentUser.role}</div>
          </div>
          <button
            className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800"
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 w-72 p-4 space-y-6 min-h-[calc(100vh-56px)] ${
            isMobileMenuOpen ? 'block' : 'hidden'
          } md:block`}
        >
          {MENU_GROUPS.map(group => (
            <div key={group.title}>
              <div className="text-xs uppercase text-gray-500 font-semibold mb-2">{group.title}</div>
              <div className="space-y-1">
                {group.items
                  .filter(item => canViewTab(item.id as TabId))
                  .map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as TabId);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                        activeTab === (item.id as TabId)
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <i className={`fa-solid ${item.icon}`}></i>
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;