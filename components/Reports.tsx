import React, { useState, useMemo } from 'react';
import {
  Material, Project, StockMovement, OS, ServiceType,
  User, Building, Equipment, OSStatus
} from '../types';

interface ReportsProps {
  materials: Material[];
  projects: Project[];
  movements: StockMovement[];
  oss: OS[];
  services: ServiceType[];
  users: User[];
  buildings: Building[];
  equipments: Equipment[];
}

type ReportTab = 'material_withdrawal' | 'executor_hours' | 'cost_by_company' | 'os_summary';

const COMPANIES = ['Cropbio', 'Cropfert Industria', 'Cropfert Jandaia', 'Cropfert do Brasil'];

const Reports: React.FC<ReportsProps> = ({
  materials, projects, movements, oss, services, users, buildings, equipments
}) => {
  const [activeReport, setActiveReport] = useState<ReportTab>('material_withdrawal');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fmt   = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const fmtDt = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const inPeriod = (dateStr: string) => {
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo + 'T23:59:59') return false;
    return true;
  };

  const periodLabel = dateFrom || dateTo
    ? `${dateFrom ? new Date(dateFrom + 'T12:00:00').toLocaleDateString('pt-BR') : 'início'} → ${dateTo ? new Date(dateTo + 'T12:00:00').toLocaleDateString('pt-BR') : 'hoje'}`
    : 'Todo o período';

  // ======= HELPER: Horas efetivas de uma OS (desconta pausas) =======
  const calcOsHours = (os: OS): number => {
    if (!os.startTime || !os.endTime) return 0;
    const start = new Date(os.startTime).getTime();
    const end   = new Date(os.endTime).getTime();
    let pausedMs = 0;
    if (os.pauseHistory) {
      let lastPause: number | null = null;
      os.pauseHistory.forEach(e => {
        const t = new Date(e.timestamp).getTime();
        if (e.action === 'PAUSE') lastPause = t;
        else if (e.action === 'RESUME' && lastPause !== null) { pausedMs += t - lastPause; lastPause = null; }
      });
    }
    return Math.max(0, (end - start - pausedMs) / 3600000);
  };

  // ======= RELATÓRIO 1: RETIRADA DE MATERIAIS =======
  const materialWithdrawals = useMemo(() =>
    movements
      .filter(m => m.type === 'OUT' && inPeriod(m.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(m => {
        const mat  = materials.find(x => x.id === m.materialId);
        const usr  = users.find(u => u.id === m.userId);
        const relOs = oss.find(o => o.id === m.osId || o.number === m.osId);
        const relPrj = projects.find(p => p.id === m.projectId);
        return {
          date: m.date,
          materialCode: mat?.code || '—',
          materialName: mat?.description || m.materialId,
          quantity: m.quantity,
          unit: mat?.unit || '—',
          unitCost: mat?.unitCost || 0,
          totalCost: m.quantity * (mat?.unitCost || 0),
          withdrawnBy: usr?.name || m.userId || 'Desconhecido',
          destination: relOs ? `OS ${relOs.number}` : relPrj ? `Proj. ${relPrj.code}` : m.description || '—',
          fromLocation: m.fromLocation || '—',
        };
      }),
  [movements, materials, users, oss, projects, dateFrom, dateTo]);

  const totalWithdrawalCost = materialWithdrawals.reduce((s, r) => s + r.totalCost, 0);

  // ======= RELATÓRIO 2: HORAS DOS EXECUTORES =======
  const executorHoursData = useMemo(() => {
    const filtered = oss.filter(o => o.status === OSStatus.COMPLETED && inPeriod(o.openDate));
    const byExec: Record<string, { name: string; hours: number; osCount: number; osNumbers: string[] }> = {};

    filtered.forEach(os => {
      const execIds = [...new Set([...(os.executorIds || []), ...(os.executorId ? [os.executorId] : [])])];
      const hours = calcOsHours(os);
      execIds.forEach(uid => {
        const u = users.find(x => x.id === uid);
        if (!byExec[uid]) byExec[uid] = { name: u?.name || uid, hours: 0, osCount: 0, osNumbers: [] };
        byExec[uid].hours += hours;
        byExec[uid].osCount += 1;
        byExec[uid].osNumbers.push(os.number);
      });
    });

    return Object.values(byExec).sort((a, b) => b.hours - a.hours);
  }, [oss, users, dateFrom, dateTo]);

  const totalHours = executorHoursData.reduce((s, r) => s + r.hours, 0);

  // ======= RELATÓRIO 3: CUSTO POR EMPRESA =======
  const costByCompanyData = useMemo(() => {
    const filtered = oss.filter(o => inPeriod(o.openDate));

    const result: Record<string, {
      materialCost: number; serviceCost: number; manualCost: number;
      osCount: number;
      sectors: Record<string, { materialCost: number; serviceCost: number; osCount: number }>;
    }> = {};

    [...COMPANIES, 'Não identificado'].forEach(c => {
      result[c] = { materialCost: 0, serviceCost: 0, manualCost: 0, osCount: 0, sectors: {} };
    });

    filtered.forEach(os => {
      const eq = equipments.find(e => e.id === os.equipmentId);
      const company = eq?.company || 'Não identificado';
      const sector  = eq?.sector  || 'Geral';

      if (!result[company]) result[company] = { materialCost: 0, serviceCost: 0, manualCost: 0, osCount: 0, sectors: {} };

      const matCost = os.materials.reduce((s, m) => s + m.quantity * m.unitCost, 0);
      const svcCost = os.services.reduce((s, sv) => s + sv.quantity * sv.unitCost, 0);
      const manCost = (os.manualMaterialCost || 0) + (os.manualServiceCost || 0);

      result[company].materialCost += matCost;
      result[company].serviceCost  += svcCost;
      result[company].manualCost   += manCost;
      result[company].osCount      += 1;

      if (!result[company].sectors[sector])
        result[company].sectors[sector] = { materialCost: 0, serviceCost: 0, osCount: 0 };
      result[company].sectors[sector].materialCost += matCost;
      result[company].sectors[sector].serviceCost  += svcCost;
      result[company].sectors[sector].osCount      += 1;
    });

    return result;
  }, [oss, equipments, dateFrom, dateTo]);

  const grandTotalCompany = Object.values(costByCompanyData).reduce(
    (s, c) => s + c.materialCost + c.serviceCost + c.manualCost, 0
  );

  // ======= RELATÓRIO 4: RESUMO DE OS =======
  const osSummaryData = useMemo(() =>
    oss
      .filter(o => inPeriod(o.openDate))
      .sort((a, b) => new Date(b.openDate).getTime() - new Date(a.openDate).getTime()),
  [oss, dateFrom, dateTo]);

  const TABS: { id: ReportTab; label: string; icon: string }[] = [
    { id: 'material_withdrawal', label: 'Retirada de Materiais', icon: 'fa-boxes'       },
    { id: 'executor_hours',      label: 'Horas dos Executores',  icon: 'fa-user-clock'  },
    { id: 'cost_by_company',     label: 'Custo por Empresa',     icon: 'fa-building'    },
    { id: 'os_summary',          label: 'Resumo de OS',          icon: 'fa-list-check'  },
  ];

  const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Aberta', IN_PROGRESS: 'Em Andamento', PAUSED: 'Pausada', COMPLETED: 'Concluída', CANCELED: 'Cancelada'
  };
  const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-slate-100 text-slate-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
    PAUSED: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-green-100 text-green-700', CANCELED: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-500 text-sm">Análise e exportação de dados do sistema</p>
      </div>

      {/* ======= Filtro de período global ======= */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <i className="fas fa-calendar-alt text-slate-400"></i>
            <span className="text-sm font-semibold">Período:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">De:</label>
            <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Até:</label>
            <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
              <i className="fas fa-times"></i> Limpar
            </button>
          )}
          <div className="ml-auto text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-semibold">
            <i className="fas fa-filter mr-1"></i>{periodLabel}
          </div>
        </div>
      </div>

      {/* ======= Tabs ======= */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeReport === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== RELATÓRIO 1: RETIRADA DE MATERIAIS ===== */}
      {activeReport === 'material_withdrawal' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-boxes text-blue-500"></i> Retirada de Materiais
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{materialWithdrawals.length} movimentos · {periodLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Custo total</p>
              <p className="font-black text-xl text-slate-900">{fmt(totalWithdrawalCost)}</p>
            </div>
          </div>

          {materialWithdrawals.length === 0
            ? <EmptyState icon="fa-box-open" text="Nenhuma retirada no período selecionado" />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs">
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Material</th>
                      <th className="px-4 py-3 text-right">Qtd</th>
                      <th className="px-4 py-3 text-right">Custo Unit.</th>
                      <th className="px-4 py-3 text-right">Custo Total</th>
                      <th className="px-4 py-3 text-left">Retirado por</th>
                      <th className="px-4 py-3 text-left">Destino</th>
                      <th className="px-4 py-3 text-left">Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialWithdrawals.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-50 hover:bg-blue-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDt(row.date)}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-800">{row.materialName}</p>
                          <p className="text-xs text-slate-400 font-mono">{row.materialCode}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right">{row.quantity} <span className="text-slate-400">{row.unit}</span></td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{fmt(row.unitCost)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">{fmt(row.totalCost)}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            <i className="fas fa-user text-[9px]"></i> {row.withdrawnBy}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{row.destination}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{row.fromLocation}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold">
                      <td className="px-4 py-3" colSpan={4}>TOTAL — {materialWithdrawals.length} movimentos</td>
                      <td className="px-4 py-3 text-right">{fmt(totalWithdrawalCost)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ===== RELATÓRIO 2: HORAS DOS EXECUTORES ===== */}
      {activeReport === 'executor_hours' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-user-clock text-blue-500"></i> Horas dos Executores
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                OS concluídas com tempo registrado · {periodLabel} · {executorHoursData.length} executor(es)
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total geral</p>
              <p className="font-black text-xl text-slate-900">{totalHours.toFixed(1)} h</p>
            </div>
          </div>

          {executorHoursData.length === 0 ? (
            <EmptyState icon="fa-clock" text="Nenhuma OS concluída com tempo registrado no período" sub="OS precisam ter data/hora de início e fim para calcular horas" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs">
                    <th className="px-4 py-3 text-left">Executor</th>
                    <th className="px-4 py-3 text-center">OS Concluídas</th>
                    <th className="px-4 py-3 text-right">Horas Trabalhadas</th>
                    <th className="px-4 py-3 text-right">Média h/OS</th>
                    <th className="px-4 py-3 text-left">OS Atendidas</th>
                  </tr>
                </thead>
                <tbody>
                  {executorHoursData.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-50 hover:bg-blue-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-full text-sm font-bold text-slate-700">{row.osCount}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-black text-lg text-slate-900">{row.hours.toFixed(1)}</span>
                        <span className="text-slate-400 text-xs ml-1">h</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {row.osCount > 0 ? (row.hours / row.osCount).toFixed(1) : '0.0'}h
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.osNumbers.slice(0, 6).map(n => (
                            <span key={n} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono font-bold">{n}</span>
                          ))}
                          {row.osNumbers.length > 6 && (
                            <span className="text-[10px] text-slate-400 italic">+{row.osNumbers.length - 6} mais</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white font-bold">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-center">{executorHoursData.reduce((s, r) => s + r.osCount, 0)}</td>
                    <td className="px-4 py-3 text-right">{totalHours.toFixed(1)} h</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== RELATÓRIO 3: CUSTO POR EMPRESA ===== */}
      {activeReport === 'cost_by_company' && (
        <div className="space-y-4">
          {/* Total geral */}
          <div className="bg-slate-800 text-white rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Custo Total — {periodLabel}</p>
              <p className="text-3xl font-black">{`R$ ${grandTotalCompany.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p>
            </div>
            <div className="text-slate-600 text-5xl"><i className="fas fa-building"></i></div>
          </div>

          {/* Card por empresa */}
          {COMPANIES.map(company => {
            const data = costByCompanyData[company];
            if (!data) return null;
            const total = data.materialCost + data.serviceCost + data.manualCost;
            const pct   = grandTotalCompany > 0 ? (total / grandTotalCompany * 100) : 0;

            return (
              <div key={company} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <i className="fas fa-building text-blue-500"></i>
                      <h3 className="font-bold text-slate-900">{company}</h3>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{data.osCount} OS</span>
                    </div>

                    {/* Barra de progresso */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 w-12 text-right">{pct.toFixed(1)}%</span>
                    </div>

                    {/* Sub-custos */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Materiais', val: data.materialCost, color: 'bg-blue-50 text-blue-800' },
                        { label: 'Serviços',  val: data.serviceCost,  color: 'bg-emerald-50 text-emerald-800' },
                        { label: 'Manual',    val: data.manualCost,   color: 'bg-slate-50 text-slate-700' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className={`rounded-lg p-2 ${color}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
                          <p className="text-xs font-bold mt-0.5">{`R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-2xl font-black text-blue-700">{`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p>
                  </div>
                </div>

                {/* Drill-down por setor */}
                {Object.keys(data.sectors).length > 0 && (
                  <details className="border-t border-slate-100">
                    <summary className="px-5 py-3 text-xs font-bold text-blue-600 cursor-pointer hover:bg-blue-50 flex items-center gap-2 list-none">
                      <i className="fas fa-chevron-right text-[10px] group-open:rotate-90"></i>
                      <i className="fas fa-layer-group"></i>
                      Detalhar por setor ({Object.keys(data.sectors).length})
                    </summary>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-blue-50 text-blue-900 text-xs">
                            <th className="px-5 py-2.5 text-left">Setor</th>
                            <th className="px-4 py-2.5 text-center">OS</th>
                            <th className="px-4 py-2.5 text-right">Materiais</th>
                            <th className="px-4 py-2.5 text-right">Serviços</th>
                            <th className="px-4 py-2.5 text-right font-bold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.sectors)
                            .sort((a, b) => (b[1].materialCost + b[1].serviceCost) - (a[1].materialCost + a[1].serviceCost))
                            .map(([sector, costs], si) => (
                              <tr key={sector} className={si % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="px-5 py-2 font-medium text-slate-700">{sector}</td>
                                <td className="px-4 py-2 text-center text-slate-500">{costs.osCount}</td>
                                <td className="px-4 py-2 text-right text-slate-600">{fmt(costs.materialCost)}</td>
                                <td className="px-4 py-2 text-right text-slate-600">{fmt(costs.serviceCost)}</td>
                                <td className="px-4 py-2 text-right font-bold text-slate-900">{fmt(costs.materialCost + costs.serviceCost)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            );
          })}

          {/* OS sem empresa identificada */}
          {costByCompanyData['Não identificado']?.osCount > 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-sm text-slate-500 flex items-start gap-3">
              <i className="fas fa-question-circle text-slate-400 mt-0.5 shrink-0"></i>
              <p>
                <strong>{costByCompanyData['Não identificado'].osCount} OS</strong> sem empresa identificada
                (custo: {fmt(costByCompanyData['Não identificado'].materialCost + costByCompanyData['Não identificado'].serviceCost)}).
                Vincule equipamentos a empresas no módulo de Equipamentos para rastrear corretamente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== RELATÓRIO 4: RESUMO DE OS ===== */}
      {activeReport === 'os_summary' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-list-check text-blue-500"></i> Resumo de Ordens de Serviço
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{osSummaryData.length} OS · {periodLabel}</p>
          </div>

          {osSummaryData.length === 0 ? (
            <EmptyState icon="fa-clipboard-list" text="Nenhuma OS no período selecionado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs">
                    <th className="px-4 py-3 text-left">Número</th>
                    <th className="px-4 py-3 text-left">Descrição</th>
                    <th className="px-4 py-3 text-left">Abertura</th>
                    <th className="px-4 py-3 text-left">Limite SLA</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {osSummaryData.map((os, i) => {
                    const late = new Date(os.limitDate) < new Date() && os.status !== OSStatus.COMPLETED && os.status !== OSStatus.CANCELED;
                    const cost = os.materials.reduce((s, m) => s + m.quantity * m.unitCost, 0)
                      + os.services.reduce((s, sv) => s + sv.quantity * sv.unitCost, 0)
                      + (os.manualMaterialCost || 0) + (os.manualServiceCost || 0);
                    return (
                      <tr key={os.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-700 text-xs">{os.number}</td>
                        <td className="px-4 py-2.5 max-w-xs">
                          <p className="truncate font-medium text-slate-800">{os.description}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDt(os.openDate)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={late ? 'text-red-600 font-bold' : 'text-slate-600'}>{fmtDt(os.limitDate)}</span>
                          {late && <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">ATRASADA</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[os.status]}`}>
                            {STATUS_LABELS[os.status]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            os.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                            os.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                            os.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {os.priority === 'CRITICAL' ? 'Crítica' : os.priority === 'HIGH' ? 'Alta' : os.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                          {cost > 0 ? fmt(cost) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ icon: string; text: string; sub?: string }> = ({ icon, text, sub }) => (
  <div className="text-center py-14 text-slate-400">
    <i className={`fas ${icon} text-4xl mb-3 block`}></i>
    <p className="font-semibold">{text}</p>
    {sub && <p className="text-sm mt-1 text-slate-400">{sub}</p>}
  </div>
);

export default Reports;