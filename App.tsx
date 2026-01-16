
import React, { useState, useEffect, useRef } from 'react';
import { 
  Project, OS, Material, ServiceType, StockMovement, 
  UserRole, OSStatus, ProjectStatus
} from './types';
import { INITIAL_MATERIALS, INITIAL_SERVICES, INITIAL_PROJECTS } from './constants';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import OSList from './components/OSList';
import Inventory from './components/Inventory';
import ServiceManager from './components/ServiceManager';
import SupplierManager from './components/SupplierManager';
import Documentation from './components/Documentation';
import { supabase, mapFromSupabase, mapToSupabase } from './services/supabase';

// Definição da estrutura do Menu
const MENU_GROUPS = [
  {
    title: "Estratégico",
    items: [
      { id: 'dash', icon: 'fa-chart-pie', label: 'Dashboard' },
      { id: 'projects', icon: 'fa-folder-tree', label: 'Projetos (Capex)' },
      { id: 'os', icon: 'fa-screwdriver-wrench', label: 'Ordens de Serviço' }
    ]
  },
  {
    title: "Operacional",
    items: [
      { id: 'inventory', icon: 'fa-warehouse', label: 'Almoxarifado' },
      { id: 'services', icon: 'fa-users-gear', label: 'Serviços' },
      { id: 'suppliers', icon: 'fa-handshake', label: 'Fornecedores' }
    ]
  },
  {
    title: "Sistema",
    items: [
      { id: 'docs', icon: 'fa-book-open', label: 'Documentação' }
    ]
  }
] as const;

type TabId = typeof MENU_GROUPS[number]['items'][number]['id'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dash');
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [services, setServices] = useState<ServiceType[]>(INITIAL_SERVICES);
  const [oss, setOss] = useState<OS[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]); 
  const [purchases, setPurchases] = useState<any[]>([]);
  const [userRole] = useState<UserRole>('ADMIN');

  // Estado de Layout Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estado de Sincronização
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'offline' | 'error'>('online');
  const [firstLoad, setFirstLoad] = useState(true);

  // Refs para debounce de salvamento
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregamento Inicial Híbrido (Supabase > LocalStorage > Initial)
  useEffect(() => {
    const loadData = async () => {
      setSyncStatus('syncing');
      try {
        // Tenta buscar do Supabase
        const [p, m, s, o, mov, sup] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('materials').select('*'),
          supabase.from('services').select('*'),
          supabase.from('oss').select('*'),
          supabase.from('stock_movements').select('*'),
          supabase.from('suppliers').select('*')
        ]);

        if (p.error || m.error) throw new Error("Erro de conexão com DB");

        const dbProjects = mapFromSupabase<Project>(p.data);
        const dbMaterials = mapFromSupabase<Material>(m.data);
        
        // Se o banco retornar dados, usamos eles. Se estiver vazio (tabela nova), tentamos localStorage
        if (dbProjects.length > 0 || dbMaterials.length > 0) {
            setProjects(dbProjects.length ? dbProjects : INITIAL_PROJECTS);
            setMaterials(dbMaterials.length ? dbMaterials : INITIAL_MATERIALS);
            setServices(mapFromSupabase<ServiceType>(s.data).length ? mapFromSupabase<ServiceType>(s.data) : INITIAL_SERVICES);
            setOss(mapFromSupabase<OS>(o.data));
            setMovements(mapFromSupabase<StockMovement>(mov.data));
            setSuppliers(mapFromSupabase<any>(sup.data));
            setSyncStatus('online');
        } else {
            // Fallback para LocalStorage se o banco estiver vazio (primeiro uso)
            const stored = localStorage.getItem('crop_service_v3_data');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.projects) setProjects(data.projects);
                if (data.materials) setMaterials(data.materials);
                if (data.services) setServices(data.services);
                if (data.oss) setOss(data.oss);
                if (data.movements) setMovements(data.movements);
                if (data.suppliers) setSuppliers(data.suppliers);
            }
            setSyncStatus('online'); // Consideramos online mas vazio
        }
      } catch (err) {
        console.warn("Supabase não conectado ou tabelas inexistentes. Usando LocalStorage.", err);
        // Fallback completo para LocalStorage
        const stored = localStorage.getItem('crop_service_v3_data');
        if (stored) {
          const data = JSON.parse(stored);
          if (data.projects) setProjects(data.projects);
          if (data.materials) setMaterials(data.materials);
          if (data.services) setServices(data.services);
          if (data.oss) setOss(data.oss);
          if (data.movements) setMovements(data.movements);
          if (data.suppliers) setSuppliers(data.suppliers);
        }
        setSyncStatus('offline');
      } finally {
        setFirstLoad(false);
      }
    };

    loadData();
  }, []);

  // Sincronização e Persistência
  useEffect(() => {
    if (firstLoad) return;

    // 1. Salva Localmente
    localStorage.setItem('crop_service_v3_data', JSON.stringify({ projects, materials, services, oss, movements, suppliers }));

    // 2. Debounce para salvar no Supabase
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
       if (syncStatus === 'offline') return;
       
       setSyncStatus('syncing');
       try {
          // Upsert em Batch para cada tabela
          // Nota: Isso é uma estratégia simplificada "Document-Store". 
          // Em produção real, faríamos apenas o diff ou endpoints específicos.
          
          await Promise.all([
             ...projects.map(item => supabase.from('projects').upsert(mapToSupabase(item))),
             ...materials.map(item => supabase.from('materials').upsert(mapToSupabase(item))),
             ...services.map(item => supabase.from('services').upsert(mapToSupabase(item))),
             ...oss.map(item => supabase.from('oss').upsert(mapToSupabase(item))),
             ...movements.map(item => supabase.from('stock_movements').upsert(mapToSupabase(item))),
             ...suppliers.map(item => supabase.from('suppliers').upsert(mapToSupabase(item))),
          ]);
          setSyncStatus('online');
       } catch (e) {
          console.error("Erro ao sincronizar", e);
          setSyncStatus('error');
       }
    }, 2000); // 2 segundos de inatividade para disparar o sync

    return () => { if(timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [projects, materials, services, oss, movements, suppliers, firstLoad]);

  const handleStockChange = (mId: string, qty: number, osNumber: string) => {
    setMaterials(prev => prev.map(m => 
      m.id === mId ? { ...m, currentStock: m.currentStock - qty } : m
    ));
    
    setMovements(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'OUT',
      materialId: mId,
      quantity: qty,
      date: new Date().toISOString(),
      userId: 'ADMIN',
      osId: osNumber,
      description: `Baixa via ${osNumber}`
    }]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dash': 
        return <Dashboard projects={projects} oss={oss} materials={materials} services={services} />;
      case 'projects': 
        return <ProjectList projects={projects} setProjects={setProjects} oss={oss} materials={materials} services={services} />;
      case 'os': 
        return (
          <OSList 
            oss={oss} 
            setOss={setOss} 
            projects={projects} 
            materials={materials} 
            services={services}
            onStockChange={handleStockChange}
          />
        );
      case 'inventory': 
        return (
          <Inventory 
            materials={materials} 
            movements={movements} 
            setMaterials={setMaterials} 
            onAddMovement={(m) => setMovements(p => [...p, m])} 
          />
        );
      case 'services':
        return <ServiceManager services={services} setServices={setServices} />;
      case 'suppliers':
        return <SupplierManager suppliers={suppliers} setSuppliers={setSuppliers} purchases={purchases} materials={materials} />;
      case 'docs':
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

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out shadow-2xl
          md:relative md:translate-x-0 md:shadow-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:w-20 lg:w-72
        `}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800/50 bg-slate-950 shrink-0 justify-between md:justify-center lg:justify-start">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-lg shadow-white/5 shrink-0 overflow-hidden">
               <img src="https://placehold.co/100x100/ffffff/000000?text=GCSF" alt="GCSF Logo" className="w-full h-full object-contain" />
             </div>
             <div className="block md:hidden lg:block">
               <h1 className="text-xl font-bold text-white tracking-tight leading-none">Crop Service</h1>
               <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Industrial ERP</span>
             </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
             <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar px-3 space-y-8">
          {MENU_GROUPS.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="block md:hidden lg:block px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800/50 pb-2 mx-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
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
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white border border-slate-600 group-hover:border-clean-primary group-hover:bg-clean-primary transition-all shrink-0">
              DT
            </div>
            <div className="block md:hidden lg:block overflow-hidden">
              <p className="text-sm font-bold text-white truncate">Diretoria Técnica</p>
              <p className="text-xs text-slate-400 truncate">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f1f5f9]">
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
               <i className="fas fa-home text-slate-400 text-lg hidden sm:block"></i>
               <i className="fas fa-chevron-right text-xs text-slate-300 hidden sm:block"></i>
               <span className="font-semibold text-slate-800 hidden sm:block">Planta Industrial A01</span>
               <i className="fas fa-chevron-right text-xs text-slate-300 hidden sm:block"></i>
               <span className="font-bold text-clean-primary text-lg sm:text-xl truncate">
                 {MENU_GROUPS.reduce((acc, g) => [...acc, ...g.items], [] as any[]).find(i => i.id === activeTab)?.label}
               </span>
             </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
             {/* Status Sync */}
             <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200" title="Status da Conexão com Supabase">
                <span className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                <span className="text-xs font-bold text-slate-600 uppercase">
                    {syncStatus === 'online' ? 'Conectado' : syncStatus === 'syncing' ? 'Sync...' : syncStatus === 'error' ? 'Erro' : 'Offline'}
                </span>
             </div>

             <div className="relative hidden md:block">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base"></i>
                <input type="text" placeholder="Pesquisar..." className="pl-11 pr-4 h-11 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-clean-primary/20 focus:bg-white focus:border-clean-primary w-64 xl:w-80 transition-all shadow-sm placeholder:text-slate-400" />
             </div>
             
             <button className="w-11 h-11 rounded-full bg-white hover:bg-slate-50 border border-slate-300 flex items-center justify-center text-slate-600 transition-all relative shadow-sm hover:shadow active:scale-95">
                <i className="fas fa-bell text-lg"></i>
                <span className="absolute top-2.5 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
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
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative ${
      active 
        ? 'bg-clean-primary text-white font-bold shadow-lg shadow-clean-primary/20' 
        : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'
    }`}
    title={label}
  >
    <div className={`w-6 flex justify-center shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>
      <i className={`fas ${icon} text-lg`}></i>
    </div>
    <span className="block md:hidden lg:block text-base tracking-tight truncate">{label}</span>
    
    {/* Tooltip for collapsed state on Desktop */}
    <div className="hidden md:block lg:hidden absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
      {label}
    </div>
  </button>
);

export default App;
