
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const stored = localStorage.getItem('crop_service_v3_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.projects) setProjects(data.projects);
        if (data.materials) setMaterials(data.materials);
        if (data.services) setServices(data.services);
        if (data.oss) setOss(data.oss);
        if (data.movements) setMovements(data.movements);
        if (data.suppliers) setSuppliers(data.suppliers);
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('crop_service_v3_data', JSON.stringify({ projects, materials, services, oss, movements, suppliers }));
  }, [projects, materials, services, oss, movements, suppliers]);

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
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased font-sans text-slate-900 font-medium">
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
             <i className="fas fa-home text-slate-400"></i>
             <i className="fas fa-chevron-right text-xs text-slate-300"></i>
             <span className="font-semibold text-slate-800">Planta Industrial A01</span>
             <i className="fas fa-chevron-right text-xs text-slate-300"></i>
             <span className="font-bold text-clean-primary text-lg">{MENU_GROUPS.reduce((acc, g) => [...acc, ...g.items], [] as any[]).find(i => i.id === activeTab)?.label}</span>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                <input type="text" placeholder="Pesquisar..." className="pl-11 pr-5 h-11 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-clean-primary/20 focus:bg-white focus:border-clean-primary w-72 transition-all shadow-sm placeholder:text-slate-400" />
             </div>
             <button className="w-11 h-11 rounded-full bg-white hover:bg-slate-50 border border-slate-300 flex items-center justify-center text-slate-600 transition-all relative shadow-sm hover:shadow">
                <i className="fas fa-bell text-lg"></i>
                <span className="absolute top-2.5 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-[1800px] mx-auto">
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
    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all group relative ${
      active 
        ? 'bg-clean-primary text-white font-bold shadow-lg shadow-clean-primary/25' 
        : 'text-slate-300 hover:bg-white/5 hover:text-white font-semibold'
    }`}
  >
    <div className={`w-6 flex justify-center ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
      <i className={`fas ${icon} text-lg`}></i>
    </div>
    <span className="hidden lg:block text-base tracking-tight">{label}</span>
  </button>
);

export default App;
