
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased font-sans text-slate-900 font-medium text-base">
      {/* Sidebar - Aumentada e com melhor contraste */}
      <aside className="w-full md:w-20 lg:w-72 bg-slate-900 flex-shrink-0 flex flex-col z-50 border-r border-slate-800">
        <div className="h-24 flex items-center px-6 border-b border-slate-800/50 bg-slate-950">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-lg shadow-white/5 shrink-0 overflow-hidden">
               <img src="https://placehold.co/100x100/ffffff/000000?text=GCSF" alt="GCSF Logo" className="w-full h-full object-contain" />
             </div>
             <div className="hidden lg:block">
               <h1 className="text-xl font-bold text-white tracking-tight leading-none">Crop Service</h1>
               <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Industrial ERP</span>
             </div>
          </div>
        </div>

        <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar px-4 space-y-8">
          {MENU_GROUPS.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="hidden lg:block px-4 text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-slate-800/50 pb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <SidebarLink 
                    key={item.id}
                    active={activeTab === item.id} 
                    onClick={() => setActiveTab(item.id as TabId)} 
                    icon={item.icon} 
                    label={item.label} 
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white border border-slate-600 group-hover:border-clean-primary group-hover:bg-clean-primary transition-all">
              DT
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="text-base font-semibold text-white truncate">Diretoria Técnica</p>
              <p className="text-xs text-slate-300 truncate">{userRole} Logged</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f1f5f9]">
        {/* Header - Mais alto e com busca clara */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-40 shadow-sm">
          <div className="flex items-center gap-3 text-base text-slate-600">
             <i className="fas fa-home text-slate-400 text-lg"></i>
             <i className="fas fa-chevron-right text-xs text-slate-300"></i>
             <span className="font-semibold text-slate-800">Planta Industrial A01</span>
             <i className="fas fa-chevron-right text-xs text-slate-300"></i>
             <span className="font-bold text-clean-primary text-xl">{MENU_GROUPS.reduce((acc, g) => [...acc, ...g.items], [] as any[]).find(i => i.id === activeTab)?.label}</span>
          </div>
          
          <div className="flex items-center gap-6">
             {/* Status Sync */}
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200" title="Status da Conexão com Supabase">
                <span className={`w-3 h-3 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                <span className="text-xs font-bold text-slate-600 uppercase">
                    {syncStatus === 'online' ? 'Conectado' : syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'error' ? 'Erro Sync' : 'Offline'}
                </span>
             </div>

             <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base"></i>
                <input type="text" placeholder="Pesquisar..." className="pl-11 pr-5 h-12 bg-slate-50 border border-slate-300 rounded-lg text-base font-medium text-slate-800 focus:ring-2 focus:ring-clean-primary/20 focus:bg-white focus:border-clean-primary w-80 transition-all shadow-sm placeholder:text-slate-400" />
             </div>
             <button className="w-12 h-12 rounded-full bg-white hover:bg-slate-50 border border-slate-300 flex items-center justify-center text-slate-600 transition-all relative shadow-sm hover:shadow">
                <i className="fas fa-bell text-xl"></i>
                <span className="absolute top-3 right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-[1920px] mx-auto">
            {renderContent()}
          </div>
        </section>
      </main>
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
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all group relative ${
      active 
        ? 'bg-clean-primary text-white font-bold shadow-lg shadow-clean-primary/25' 
        : 'text-slate-300 hover:bg-white/5 hover:text-white font-medium'
    }`}
  >
    <div className={`w-6 flex justify-center ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
      <i className={`fas ${icon} text-xl`}></i>
    </div>
    <span className="hidden lg:block text-lg tracking-tight">{label}</span>
  </button>
);

export default App;
