
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

  // Carregamento Inicial do Supabase (Única Fonte de Dados)
  useEffect(() => {
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        console.log('🚀 Starting data load from Supabase...');
        await loadCustomPermissions();
        await loadUserPermissions();

        const [p, m, s, o, mov, sup, usr, pur, bld, eqp] = await Promise.all([
          supabase.from('projects').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('materials').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('services').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('oss').select('*', { count: 'exact' }).order('open_date', { ascending: false }).limit(10000),
          supabase.from('stock_movements').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('suppliers').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('users').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('purchases').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('buildings').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000),
          supabase.from('equipments').select('*', { count: 'exact' }).order('updated_at', { ascending: false }).limit(10000)
        ]);

        console.log('📊 CONTAGEM TOTAL (count):', {
          materials: m.count,
          projects: p.count,
          oss: o.count
        });

        if (p.error) console.error("❌ Error loading projects:", p.error);
        if (m.error) console.error("❌ Error loading materials:", m.error);
        if (s.error) console.error("❌ Error loading services:", s.error);
        if (o.error) console.error("❌ Error loading OSs:", o.error);
        if (mov.error) console.error("❌ Error loading stock_movements:", mov.error);
        if (eqp.error) console.error("❌ Error loading equipments:", eqp.error);
        if (usr.error) console.error("❌ Error loading users:", usr.error);

        if (p.error || m.error || s.error || usr.error) {
          console.error("Critical errors found. Check logs above.");
          throw new Error("Erro de conexão com Supabase");
        }

        console.log('✅ Data loaded successfully:');
        console.log('  - Projects:', p.data?.length || 0);
        console.log('  - Materials:', m.data?.length || 0);
        console.log('  - Services:', s.data?.length || 0);
        console.log('  - OSs:', o.data?.length || 0);
        console.log('  - Stock Movements:', mov.data?.length || 0);
        console.log('  - Equipments:', eqp.data?.length || 0);

        // Log detalhado de materiais por localização
        const materialsByLocation = (m.data || []).reduce((acc, mat) => {
          const loc = mat.location || 'Sem localização';
          acc[loc] = (acc[loc] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('📦 Materiais por localização:', materialsByLocation);

        // Análise ANTES do mapeamento
        console.log('📊 ANÁLISE DOS DADOS BRUTOS:');
        if (m.data) {
          const rawLocationBreakdown = m.data.reduce((acc, mat) => {
            const loc = mat.location || 'NULL';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log('  - Contagem por location (ANTES do mapeamento):', rawLocationBreakdown);
        }

        const mappedMaterials = mapFromSupabase<Material>(m.data || []);
        console.log('🔍 DIAGNÓSTICO DE MATERIAIS:');
        console.log('  - Total carregado do Supabase:', m.data?.length || 0);
        console.log('  - Total após mapeamento:', mappedMaterials.length);

        const locationBreakdown = mappedMaterials.reduce((acc, mat) => {
          const loc = mat.location || 'SEM LOCALIZAÇÃO';
          acc[loc] = (acc[loc] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('  - Por localização (DEPOIS do mapeamento):', locationBreakdown);

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

    const relatedOS = oss.find(os => os.number === osNumber);

    setMaterials(prev => prev.map(m => {
      if (m.id === mId) {
        let remainingToDeduct = qty;
        let newLocations: StockLocation[] = m.stockLocations ? [...m.stockLocations] : [{ name: m.location || 'Geral', quantity: m.currentStock }];

        // Lógica de consumo inteligente de locais
        newLocations = newLocations.map(loc => {
            if (remainingToDeduct <= 0) return loc;

            if (loc.quantity >= remainingToDeduct) {
                loc.quantity -= remainingToDeduct;
                remainingToDeduct = 0;
            } else {
                remainingToDeduct -= loc.quantity;
                loc.quantity = 0;
            }
            return loc;
        }).filter(l => l.quantity > 0 || newLocations.length === 1); // Mantém pelo menos um local mesmo se zero

        // Se ainda sobrou algo pra deduzir (estoque negativo global), tira do primeiro local
        if (remainingToDeduct > 0 && newLocations.length > 0) {
            newLocations[0].quantity -= remainingToDeduct;
        }

        const newTotal = newLocations.reduce((acc, l) => acc + l.quantity, 0);

        updatedMaterial = {
            ...m,
            currentStock: newTotal,
            stockLocations: newLocations
        };
        return updatedMaterial;
      }
      return m;
    }));

    let description = `Baixa via ${osNumber}`;
    let costCenter: string | undefined;
    let projectId: string | undefined;

    if (relatedOS) {
      if (relatedOS.projectId) {
        const project = projects.find(p => p.id === relatedOS.projectId);
        description = `Baixa p/ Projeto: ${project?.code || 'N/A'} / OS: ${osNumber}`;
        costCenter = project?.costCenter;
        projectId = relatedOS.projectId;
      } else if (relatedOS.buildingId) {
        const building = buildings.find(b => b.id === relatedOS.buildingId);
        description = `Baixa p/ Edifício: ${building?.name || 'N/A'} / OS: ${osNumber}`;
        costCenter = relatedOS.costCenter;
      } else if (relatedOS.equipmentId) {
        const equipment = equipments.find(e => e.id === relatedOS.equipmentId);
        description = `Baixa p/ Equipamento: ${equipment?.name || 'N/A'} / OS: ${osNumber}`;
        costCenter = relatedOS.costCenter;
      }
    }

    newMovement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'OUT',
      materialId: mId,
      quantity: qty,
      date: new Date().toISOString(),
      userId: currentUser?.id || 'SYSTEM',
      osId: osNumber,
      description: description,
      fromLocation: 'Automático',
      projectId: projectId,
      costCenter: costCenter
    };

    setMovements(prev => [...prev, newMovement!]);

    // Salvar no Supabase
    try {
      if (updatedMaterial) {
        const { error: matError } = await supabase.from('materials').upsert(mapToSupabase(updatedMaterial));
        if (matError) throw matError;
      }

      if (newMovement) {
        const { error: movError } = await supabase.from('stock_movements').insert(mapToSupabaseJson(newMovement));
        if (movError) throw movError;
      }
    } catch (e) {
      console.error('Erro ao salvar movimento de estoque:', e);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('crop_user_session', JSON.stringify(user));
    const defaultTab = user.role === 'USER' ? 'calendar' : 'dashboard';
    setActiveTab(defaultTab);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('crop_user_session');
  };

  // Se não estiver logado, mostra Login
  if (!currentUser) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  // Lógica Especial para EXECUTOR: Painel Simplificado
  if (currentUser.role === 'EXECUTOR') {
      return (
        <ExecutorPanel
          user={currentUser}
          oss={oss}
          setOss={setOss}
          projects={projects}
          buildings={buildings}
          equipments={equipments}
          onLogout={handleLogout}
          services={services}
          materials={materials}
        />
      );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard projects={projects} oss={oss} materials={materials} services={services} />;
      case 'projects': 
        return (
          <ProjectList
            projects={projects}
            setProjects={setProjects}
            oss={oss}
            materials={materials}
            setMaterials={setMaterials}
            services={services}
            movements={movements}
            currentUser={currentUser}
          />
        );
      case 'os': 
        return (
          <OSList
            oss={oss}
            setOss={setOss}
            projects={projects}
            buildings={buildings}
            equipments={equipments}
            materials={materials}
            setMaterials={setMaterials}
            services={services}
            users={users}
            setUsers={setUsers}
            movements={movements}
            onStockChange={handleStockChange}
            currentUser={currentUser}
          />
        );
      case 'calendar':
        return <CalendarView oss={oss} projects={projects} materials={materials} services={services} users={users} />;
      case 'buildings':
        return <BuildingManager buildings={buildings} setBuildings={setBuildings} currentUser={currentUser} />;
      case 'equipments':
        return <EquipmentManager equipments={equipments} setEquipments={setEquipments} currentUser={currentUser} />;
      case 'inventory': 
        return (
          <Inventory
            materials={materials}
            movements={movements}
            setMaterials={setMaterials}
            onAddMovement={(m) => setMovements(p => [...p, m])}
            currentUser={currentUser}
            projects={projects}
            oss={oss}
            setOss={setOss}
          />
        );
      case 'services':
        return <ServiceManager services={services} setServices={setServices} currentUser={currentUser} />;
      case 'suppliers':
        return <SupplierManager suppliers={suppliers} setSuppliers={setSuppliers} purchases={purchases} materials={materials} currentUser={currentUser} />;
      case 'users':
        return <UserManagement users={users} setUsers={setUsers} currentUser={currentUser} />;
      case 'reports':
        // Agora passamos os users, buildings e equipments para gerar os nomes corretos nos relatórios
        return (
          <Reports 
            materials={materials} 
            projects={projects} 
            movements={movements} 
            oss={oss} 
            services={services} 
            users={users} 
            buildings={buildings}
            equipments={equipments}
          />
        );
      case 'documentation':
        return <Documentation />;
      default:
        return null;
    }
  };

  // Fecha o menu mobile ao trocar de aba
  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  // Função para verificar se usuário tem acesso ao módulo
  const hasModuleAccess = (moduleId: string): boolean => {
    if (!currentUser) return false;
    return canAccessModule(currentUser.role, moduleId as ModuleId);
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation - CUSTOM COLOR #001529 */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-[#001529] text-white flex flex-col border-r border-white/10 transition-transform duration-300 ease-in-out shadow-2xl
          md:relative md:translate-x-0 md:shadow-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:w-20 lg:w-72
        `}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-white/10 bg-[#001529] shrink-0 justify-between md:justify-center lg:justify-start relative overflow-hidden group">
          <div className="flex items-center gap-3 relative z-10">
             {/* Logo Icon Style - imitating the fingerprint logo */}
             <div className="w-10 h-10 flex items-center justify-center text-clean-primary text-2xl group-hover:scale-110 transition-transform">
               <i className="fas fa-fingerprint"></i>
             </div>
             <div className="block md:hidden lg:block">
               <h1 className="text-xl font-black text-white tracking-tighter leading-none">CropService</h1>
               <span className="text-[10px] text-clean-primary font-bold uppercase tracking-widest block -mt-1">Engineering</span>
             </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white hover:text-clean-primary transition-colors">
             <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Menu Items (Filtered by Permissions) */}
        <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar px-3 space-y-8">
          {MENU_GROUPS.map((group, groupIndex) => {
            const filteredItems = group.items.filter(item => hasModuleAccess(item.id));

            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIndex}>
                <h3 className="block md:hidden lg:block px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 mx-2">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <SidebarLink
                      key={item.id}
                      active={activeTab === item.id}
                      onClick={() => handleTabChange(item.id as TabId)}
                      icon={item.icon}
                      label={item.label}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Footer with Logout - Darker Shade */}
        <div className="p-4 border-t border-white/10 bg-[#000b14] shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group mb-2">
            <div className="w-10 h-10 rounded-full bg-[#001529] flex items-center justify-center text-sm font-bold text-white border border-white/20 group-hover:border-clean-primary transition-all shrink-0">
              {currentUser.avatar}
            </div>
            <div className="block md:hidden lg:block overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-white/70 truncate capitalize">{currentUser.role.toLowerCase().replace('warehouse_', 'almox_')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors uppercase tracking-wider">
             <i className="fas fa-sign-out-alt"></i> Sair
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc]">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-sm relative">
          <div className="flex items-center gap-4 text-base text-slate-600 overflow-hidden">
             <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all"
             >
                <i className="fas fa-bars text-lg"></i>
             </button>

             <div className="flex items-center gap-2 truncate">
               <span className="font-bold text-slate-400 hidden sm:block">CropService <span className="text-clean-primary">/</span></span>
               <span className="font-bold text-slate-900 text-lg sm:text-xl truncate">
                 {MENU_GROUPS.reduce((acc, g) => [...acc, ...g.items], [] as any[]).find(i => i.id === activeTab)?.label || 'Bem-vindo'}
               </span>
             </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
             {/* Status Sync */}
             <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200" title="Status da Conexão com Supabase">
                <span className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-clean-primary' : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {syncStatus === 'online' ? 'Online' : syncStatus === 'syncing' ? 'Sync...' : syncStatus === 'error' ? 'Erro' : 'Offline'}
                </span>
             </div>
             
             <button className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-clean-primary transition-all relative shadow-sm hover:shadow active:scale-95">
                <i className="fas fa-bell"></i>
                <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-[1920px] mx-auto pb-10">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group relative ${
      active 
        ? 'bg-clean-primary text-white font-bold border border-white shadow-md' 
        : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'
    }`}
    title={label}
  >
    <div className={`w-6 flex justify-center shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
      <i className={`fas ${icon} text-lg`}></i>
    </div>
    <span className="block md:hidden lg:block text-sm tracking-tight truncate">{label}</span>
    
    {/* Tooltip for collapsed state on Desktop */}
    <div className="hidden md:block lg:hidden absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700 font-bold">
      {label}
    </div>
  </button>
);

export default App;
