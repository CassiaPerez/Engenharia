
import React, { useState, useEffect } from 'react';
import { 
  Project, OS, Material, ServiceType, StockMovement, 
  UserRole 
} from './types';
import { INITIAL_MATERIALS, INITIAL_SERVICES, INITIAL_PROJECTS } from './constants';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import OSList from './components/OSList';
import Inventory from './components/Inventory';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dash' | 'projects' | 'os' | 'inventory'>('dash');
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [services, setServices] = useState<ServiceType[]>(INITIAL_SERVICES);
  const [oss, setOss] = useState<OS[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [userRole] = useState<UserRole>('ADMIN');

  useEffect(() => {
    const stored = localStorage.getItem('engpro_v2_data');
    if (stored) {
      const data = JSON.parse(stored);
      setProjects(data.projects);
      setMaterials(data.materials);
      setOss(data.oss);
      setMovements(data.movements);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('engpro_v2_data', JSON.stringify({ projects, materials, oss, movements }));
  }, [projects, materials, oss, movements]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dash': return <Dashboard projects={projects} oss={oss} materials={materials} services={services} />;
      case 'projects': return <ProjectList projects={projects} setProjects={setProjects} oss={oss} materials={materials} services={services} />;
      case 'os': return (
        <OSList 
          oss={oss} setOss={setOss} projects={projects} materials={materials} services={services}
          onStockChange={(mId, qty, osNumber) => {
            setMaterials(prev => prev.map(m => m.id === mId ? { ...m, currentStock: m.currentStock - qty } : m));
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
          }}
        />
      );
      case 'inventory': return <Inventory materials={materials} movements={movements} setMaterials={setMaterials} onAddMovement={(m) => setMovements(p => [...p, m])} />;
    }
  };

  return (
    <div className="min-h-screen bg-clean-bg flex flex-col md:flex-row antialiased font-sans">
      {/* Sidebar Minimalista */}
      <aside className="w-full md:w-20 lg:w-64 bg-white border-r border-clean-border text-clean-text flex-shrink-0 flex flex-col transition-all duration-300 z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-9 h-9 bg-clean-primary rounded-xl flex items-center justify-center">
            <i className="fas fa-layer-group text-white text-sm"></i>
          </div>
          <div className="hidden lg:block">
            <span className="text-lg font-display font-bold tracking-tight text-clean-primary">EngPro</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <SidebarLink active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon="fa-home" label="Início" />
          <SidebarLink active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon="fa-briefcase" label="Projetos" />
          <SidebarLink active={activeTab === 'os'} onClick={() => setActiveTab('os')} icon="fa-check-circle" label="Execução" />
          <SidebarLink active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon="fa-warehouse" label="Estoque" />
        </nav>

        <div className="p-6">
          <div className="flex items-center gap-3 bg-clean-bg p-3 rounded-2xl border border-clean-border">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px]">A</div>
            <div className="hidden lg:block">
              <p className="text-[11px] font-bold text-clean-text">Master</p>
              <p className="text-[9px] text-clean-secondary font-medium uppercase tracking-wider">{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-clean-border flex items-center justify-between px-8 flex-shrink-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-clean-secondary uppercase tracking-widest">Workspace</span>
            <i className="fas fa-chevron-right text-[8px] text-slate-300"></i>
            <span className="text-[10px] font-bold text-clean-primary uppercase tracking-widest">Produção</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-clean-bg rounded-lg border border-clean-border">
               <i className="fas fa-search text-slate-300 text-[10px]"></i>
               <input type="text" placeholder="Busca rápida..." className="bg-transparent text-[11px] font-medium outline-none w-40 text-slate-600" />
            </div>
            <button className="text-slate-400 hover:text-clean-primary transition-colors">
              <i className="fas fa-bell text-sm"></i>
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-[1400px] mx-auto">
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  );
};

const SidebarLink = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-150 group ${
      active ? 'bg-clean-primary text-white shadow-sm' : 'text-clean-secondary hover:bg-slate-50 hover:text-clean-primary'
    }`}
  >
    <i className={`fas ${icon} text-sm w-5`}></i>
    <span className="hidden lg:block text-xs font-semibold">{label}</span>
  </button>
);

export default App;
