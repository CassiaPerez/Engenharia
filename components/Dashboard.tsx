import React, { useMemo } from 'react';
import { Project, OS, Material, ServiceType, User, Equipment, StockMovement, OSStatus, ProjectStatus } from '../types';

interface DashboardProps {
  projects: Project[];
  oss: OS[];
  materials: Material[];
  services: ServiceType[];
  // ✅ NOVOS props para KPIs extras
  users?: User[];
  equipments?: Equipment[];
  movements?: StockMovement[];
}

const Dashboard: React.FC<DashboardProps> = ({
  projects, oss, materials, services,
  users = [], equipments = [], movements = []
}) => {
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ======= KPIs =======
  const kpis = useMemo(() => {
    const osAbertas      = oss.filter(o => o.status === OSStatus.OPEN).length;
    const osEmAndamento  = oss.filter(o => o.status === OSStatus.IN_PROGRESS).length;
    const osPausadas     = oss.filter(o => o.status === OSStatus.PAUSED).length;
    const osConcluidas   = oss.filter(o => o.status === OSStatus.COMPLETED).length;

    // ✅ NOVO: OS com SLA vencido
    const osAtrasadas = oss.filter(o =>
      o.status !== OSStatus.COMPLETED && o.status !== OSStatus.CANCELED &&
      new Date(o.limitDate) < now
    ).length;

    // ✅ NOVO: Custo total do mês (OS abertas no mês corrente)
    const custoMes = oss
      .filter(o => (o.openDate || '').startsWith(mesAtual))
      .reduce((sum, o) => {
        const mat = o.materials.reduce((s, m) => s + m.quantity * m.unitCost, 0);
        const svc = o.services.reduce((s, sv) => s + sv.quantity * sv.unitCost, 0);
        return sum + mat + svc + (o.manualMaterialCost || 0) + (o.manualServiceCost || 0);
      }, 0);

    // ✅ NOVO: Materiais abaixo do estoque mínimo
    const materiaisAbaixoMin = materials.filter(m => m.status === 'ACTIVE' && m.currentStock < m.minStock).length;

    const projetosAtivos = projects.filter(p =>
      p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.PLANNED
    ).length;

    const custoTotalCapex = projects.reduce((s, p) => s + (p.estimatedValue || 0), 0);

    return { osAbertas, osEmAndamento, osPausadas, osConcluidas, osAtrasadas, custoMes, materiaisAbaixoMin, projetosAtivos, custoTotalCapex };
  }, [oss, materials, projects, mesAtual]);

  // OS por tipo
  const ossByType = useMemo(() => {
    const counts: Record<string, number> = {};
    oss.forEach(o => { counts[o.type] = (counts[o.type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [oss]);

  // OS urgentes (mais críticas no topo)
  const ossUrgentes = useMemo(() =>
    oss
      .filter(o => o.status !== OSStatus.COMPLETED && o.status !== OSStatus.CANCELED)
      .sort((a, b) => {
        const score = (o: OS) => {
          let s = 0;
          if (new Date(o.limitDate) < now) s += 1000;
          if (o.priority === 'CRITICAL') s += 100;
          if (o.priority === 'HIGH') s += 50;
          if (o.priority === 'MEDIUM') s += 10;
          return s;
        };
        return score(b) - score(a);
      }).slice(0, 6),
  [oss]);

  // Custo por empresa (via equipamentos vinculados às OS)
  const costByCompany = useMemo(() => {
    const COMPANIES = ['Cropbio', 'Cropfert Industria', 'Cropfert Jandaia', 'Cropfert do Brasil'];
    return COMPANIES.map(company => {
      const companyEqIds = new Set(equipments.filter(e => e.company === company).map(e => e.id));
      const total = oss
        .filter(o => o.equipmentId && companyEqIds.has(o.equipmentId))
        .reduce((sum, o) => {
          return sum
            + o.materials.reduce((s, m) => s + m.quantity * m.unitCost, 0)
            + o.services.reduce((s, sv) => s + sv.quantity * sv.unitCost, 0)
            + (o.manualMaterialCost || 0) + (o.manualServiceCost || 0);
        }, 0);
      return { company, total };
    });
  }, [oss, equipments]);

  const maxCompanyCost = Math.max(...costByCompany.map(c => c.total), 1);

  // Movimentos recentes
  const recentMovements = useMemo(() =>
    [...movements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
  [movements]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const fmtCompact = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmt(v);

  return (
    <div className="space-y-6">

      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ======= ROW 1: KPIs de OS ======= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon="fa-circle-dot"    label="OS Abertas"    value={kpis.osAbertas}     color="slate" />
        <KpiCard icon="fa-play-circle"   label="Em Andamento"  value={kpis.osEmAndamento}  color="blue" />
        <KpiCard icon="fa-pause-circle"  label="Pausadas"      value={kpis.osPausadas}     color="amber" />
        <KpiCard icon="fa-check-circle"  label="Concluídas"    value={kpis.osConcluidas}   color="green" />
        {/* ✅ NOVO */}
        <KpiCard icon="fa-exclamation-triangle" label="SLA Atrasado"  value={kpis.osAtrasadas}    color="red"    highlight={kpis.osAtrasadas > 0} />
        {/* ✅ NOVO */}
        <KpiCard icon="fa-box-open"      label="Mat. em Falta"  value={kpis.materiaisAbaixoMin} color="orange" highlight={kpis.materiaisAbaixoMin > 0} />
      </div>

      {/* ======= ROW 2: Cards financeiros ======= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* ✅ NOVO: Custo do mês */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-500">Custo do Mês</p>
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <i className="fas fa-wallet text-purple-500 text-sm"></i>
            </div>
          </div>
          <p className="text-2xl font-black text-purple-700">{fmtCompact(kpis.custoMes)}</p>
          <p className="text-xs text-slate-400 mt-1">OS abertas em {now.toLocaleDateString('pt-BR', { month: 'long' })}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-500">Projetos Ativos</p>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <i className="fas fa-folder-open text-blue-500 text-sm"></i>
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700">{kpis.projetosAtivos}</p>
          <p className="text-xs text-slate-400 mt-1">Capex em execução / planejamento</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-500">Orçamento Capex</p>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <i className="fas fa-chart-bar text-emerald-500 text-sm"></i>
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">{fmtCompact(kpis.custoTotalCapex)}</p>
          <p className="text-xs text-slate-400 mt-1">Valor estimado total dos projetos</p>
        </div>
      </div>

      {/* ======= ROW 3: Tabelas ======= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* OS Urgentes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-fire text-red-500"></i> OS Prioritárias
            </h2>
            <span className="text-xs text-slate-400">{ossUrgentes.length} pendente(s)</span>
          </div>
          <div className="divide-y divide-slate-50">
            {ossUrgentes.length === 0 && (
              <p className="text-center text-slate-400 py-10 text-sm">
                <i className="fas fa-check-circle text-green-300 text-2xl block mb-2"></i>
                Nenhuma OS urgente
              </p>
            )}
            {ossUrgentes.map(os => {
              const late = new Date(os.limitDate) < now;
              return (
                <div key={os.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold text-blue-600 font-mono">{os.number}</span>
                      {late && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">ATRASADA</span>}
                    </div>
                    <p className="text-sm text-slate-700 truncate font-medium">{os.description}</p>
                    <p className="text-xs text-slate-400">Limite: {new Date(os.limitDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold shrink-0 ${
                    os.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                    os.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                    os.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {os.priority === 'CRITICAL' ? 'Crítica' : os.priority === 'HIGH' ? 'Alta' : os.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ✅ NOVO: Custo por empresa */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-building text-blue-500"></i> Custo por Empresa
            </h2>
            <span className="text-xs text-slate-400">via OS vinculadas</span>
          </div>
          <div className="p-5 space-y-4">
            {costByCompany.every(c => c.total === 0) && (
              <p className="text-center text-slate-400 py-4 text-sm">
                <i className="fas fa-link-slash text-slate-300 text-2xl block mb-2"></i>
                Vincule equipamentos a empresas para ver este gráfico
              </p>
            )}
            {costByCompany.filter(c => c.total > 0).map(({ company, total }) => (
              <div key={company}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-700 truncate">{company}</span>
                  <span className="font-bold text-slate-900 ml-2 shrink-0">{fmtCompact(total)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(total / maxCompanyCost) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OS por tipo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-tags text-slate-500"></i> OS por Tipo
            </h2>
          </div>
          <div className="p-5 space-y-3">
            {ossByType.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">Sem dados</p>}
            {ossByType.map(([tipo, count]) => (
              <div key={tipo}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{tipo}</span>
                  <span className="font-bold text-slate-900">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(count / (oss.length || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Movimentos recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-exchange-alt text-slate-500"></i> Movimentos Recentes
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentMovements.length === 0 && (
              <p className="text-center text-slate-400 py-10 text-sm">Nenhum movimento registrado</p>
            )}
            {recentMovements.map(mov => {
              const mat = materials.find(m => m.id === mov.materialId);
              const usr = users.find(u => u.id === mov.userId);
              return (
                <div key={mov.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    mov.type === 'IN' ? 'bg-green-100 text-green-600' :
                    mov.type === 'OUT' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <i className={`fas ${mov.type === 'IN' ? 'fa-arrow-down' : mov.type === 'OUT' ? 'fa-arrow-up' : 'fa-arrows-alt-h'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{mat?.description || mov.materialId}</p>
                    <p className="text-xs text-slate-400">{usr?.name || mov.userId} · {new Date(mov.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${mov.type === 'OUT' ? 'text-red-600' : 'text-green-600'}`}>
                    {mov.type === 'OUT' ? '-' : '+'}{mov.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

// ======= KPI Card Component =======
interface KpiCardProps {
  icon: string;
  label: string;
  value: number;
  color: 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'orange' | 'purple';
  highlight?: boolean;
}

const COLORS: Record<string, { bg: string; text: string; iconColor: string; ring: string }> = {
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  iconColor: 'text-slate-400',  ring: 'ring-slate-200' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   iconColor: 'text-blue-400',   ring: 'ring-blue-200' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  iconColor: 'text-amber-400',  ring: 'ring-amber-200' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  iconColor: 'text-green-400',  ring: 'ring-green-200' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    iconColor: 'text-red-400',    ring: 'ring-red-300' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconColor: 'text-orange-400', ring: 'ring-orange-300' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconColor: 'text-purple-400', ring: 'ring-purple-200' },
};

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, color, highlight }) => {
  const c = COLORS[color] || COLORS.slate;
  return (
    <div className={`rounded-xl p-4 shadow-sm border border-slate-100 ${c.bg} ${highlight ? `ring-2 ${c.ring}` : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-semibold ${c.text} leading-tight`}>{label}</p>
        <i className={`fas ${icon} ${c.iconColor} text-base`}></i>
      </div>
      <p className={`text-3xl font-black ${c.text}`}>{value}</p>
      {highlight && value > 0 && (
        <p className={`text-[10px] font-bold mt-1 ${c.text} opacity-70`}>Requer atenção</p>
      )}
    </div>
  );
};

export default Dashboard;