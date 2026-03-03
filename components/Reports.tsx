import React, { useMemo, useState } from 'react';
import { Material, Project, StockMovement, OS, ServiceType, User, Building, Equipment } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateProjectCosts, calculateOSCosts } from '../services/engine';

interface Props {
  materials: Material[];
  projects: Project[];
  movements: StockMovement[];
  oss: OS[];
  services: ServiceType[];
  users?: User[];
  buildings?: Building[];
  equipments?: Equipment[];
}

type Tab = 'CARDS' | 'EXECUTOR_TASKS';

const Reports: React.FC<Props> = ({
  materials,
  projects,
  movements,
  oss,
  services,
  users = [],
  buildings = [],
  equipments = [],
}) => {
  const [tab, setTab] = useState<Tab>('CARDS');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  // filtro específico do relatório de executores
  const [selectedExecutor, setSelectedExecutor] = useState<string>('ALL');

  const formatCurrency = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDateBR = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  const formatDateTimeBR = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('pt-BR');
  };

  const resolveUserName = (idOrEmail?: string) => {
    if (!idOrEmail) return '-';
    const u = users.find(x => x.id === idOrEmail || x.email === idOrEmail);
    return u?.name || idOrEmail;
  };

  const resolveMaterialLabel = (materialId?: string) => {
    if (!materialId) return 'Material';
    const m = materials.find(x => x.id === materialId);
    if (!m) return `Material (${materialId})`;
    return `${m.description}${m.code ? ` (${m.code})` : ''}`;
  };

  const getContextLabel = (os: OS) => {
    if ((os as any).projectId) {
      const p = projects.find(x => x.id === (os as any).projectId);
      return p ? `${p.code} - ${p.description}` : `PROJETO (${(os as any).projectId})`;
    }
    if ((os as any).buildingId) {
      const b = buildings.find(x => x.id === (os as any).buildingId);
      return b ? `FACILITIES - ${b.name}` : `EDIFÍCIO (${(os as any).buildingId})`;
    }
    if ((os as any).equipmentId) {
      const e = equipments.find(x => x.id === (os as any).equipmentId);
      return e ? `${e.code || 'EQP'} - ${e.name}` : `EQUIPAMENTO (${(os as any).equipmentId})`;
    }
    return '---';
  };

  const parseRange = () => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return { from, to };
  };

  const inRange = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const { from, to } = parseRange();
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  // Mantém seus filtros gerais para relatórios “cards”
  const applyFilters = (data: any[]) => {
    let filtered = [...data];

    if (dateFrom || dateTo) {
      filtered = filtered.filter((item: any) => {
        const itemDate = new Date(item.openDate || item.date || item.startDate || item.startTime || item.endTime);
        if (dateFrom && itemDate < new Date(`${dateFrom}T00:00:00`)) return false;
        if (dateTo && itemDate > new Date(`${dateTo}T23:59:59`)) return false;
        return true;
      });
    }

    if (selectedEquipment) filtered = filtered.filter((item: any) => item.equipmentId === selectedEquipment);
    if (selectedBuilding) filtered = filtered.filter((item: any) => item.buildingId === selectedBuilding);
    if (selectedProject) filtered = filtered.filter((item: any) => item.projectId === selectedProject);

    return filtered;
  };

  // ---------------------------
  // RELATÓRIO: Materiais (Sintético)
  // ---------------------------
  const generateMaterialReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    const filteredMovements = applyFilters(movements);

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE GASTOS POR MATERIAL', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 196, 16, { align: 'right' });

    if (dateFrom || dateTo) {
      doc.setFontSize(8);
      doc.text(`Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`, 196, 20, { align: 'right' });
    }

    const materialStats = materials
      .map(mat => {
        const outMovements = filteredMovements.filter(m => m.materialId === mat.id && m.type === 'OUT');
        const totalQtyOut = outMovements.reduce((acc, m) => acc + (m.quantity || 0), 0);
        const totalCostOut = totalQtyOut * (mat.unitCost || 0);
        return {
          code: mat.code,
          description: mat.description,
          unit: mat.unit,
          qtyOut: totalQtyOut,
          unitCost: mat.unitCost || 0,
          totalCost: totalCostOut,
        };
      })
      .filter(i => i.qtyOut > 0)
      .sort((a, b) => b.totalCost - a.totalCost);

    const totalGeneral = materialStats.reduce((acc, i) => acc + i.totalCost, 0);

    const rows = materialStats.map(i => [
      i.code,
      i.description,
      `${i.qtyOut} ${i.unit}`,
      `R$ ${formatCurrency(i.unitCost)}`,
      `R$ ${formatCurrency(i.totalCost)}`,
    ]);

    rows.push(['', 'TOTAL GERAL GASTO', '', '', `R$ ${formatCurrency(totalGeneral)}`]);

    autoTable(doc, {
      startY: 30,
      head: [['Código', 'Descrição', 'Qtd Consumida', 'Custo Médio', 'Custo Total']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [71, 122, 127] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: data => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    doc.save(`Relatorio_Materiais_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ---------------------------
  // RELATÓRIO: Projetos (Consolidado)
  // ---------------------------
  const generateProjectReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('pt-BR');

    const filteredProjects = selectedProject ? projects.filter(p => p.id === selectedProject) : projects;
    const filteredOSs = applyFilters(oss);
    const filteredMovements = applyFilters(movements);

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE CUSTOS POR PROJETO (OS + BAIXA DIRETA)', 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    if (dateFrom || dateTo) {
      doc.setFontSize(8);
      doc.text(`Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`, 280, 20, { align: 'right' });
    }

    const projectStats = filteredProjects.map(proj => {
      const osCosts = calculateProjectCosts(proj, filteredOSs as any, materials as any, services as any);

      const directMovements = filteredMovements.filter(m => m.projectId === proj.id && m.type === 'OUT');
      const directMaterialCost = directMovements.reduce((acc, m) => {
        const mat = materials.find(mt => mt.id === m.materialId);
        return acc + (m.quantity || 0) * (mat?.unitCost || 0);
      }, 0);

      const totalReal = (osCosts.totalReal || 0) + directMaterialCost;

      return {
        code: proj.code,
        desc: proj.description,
        status: proj.status,
        budget: proj.estimatedValue || 0,
        osMaterial: osCosts.totalMaterials || 0,
        directMaterial: directMaterialCost,
        services: osCosts.totalServices || 0,
        total: totalReal,
      };
    });

    const rows = projectStats.map(p => [
      p.code,
      p.desc,
      p.status,
      `R$ ${formatCurrency(p.budget)}`,
      `R$ ${formatCurrency(p.osMaterial)}`,
      `R$ ${formatCurrency(p.directMaterial)}`,
      `R$ ${formatCurrency(p.services)}`,
      `R$ ${formatCurrency(p.total)}`,
    ]);

    const grandTotal = projectStats.reduce((acc, p) => acc + p.total, 0);
    rows.push(['', 'TOTAL CONSOLIDADO', '', '', '', '', '', `R$ ${formatCurrency(grandTotal)}`]);

    autoTable(doc, {
      startY: 30,
      head: [['Código', 'Projeto', 'Status', 'Budget', 'Mat. via OS', 'Mat. Direto', 'Serviços', 'Custo Total']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 122, 127] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold', textColor: [100, 100, 100] },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: data => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    doc.save(`Relatorio_Projetos_Consolidado_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ---------------------------
  // RELATÓRIO: Fluxo de Estoque (Detalhado)
  // ---------------------------
  const generateStockFlowReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('pt-BR');

    doc.setFillColor(50, 60, 70);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FLUXO DE ESTOQUE DETALHADO (ENTRADA / SAÍDA)', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    const { from, to } = parseRange();

    const periodMovements = movements.filter(m => {
      const d = new Date(m.date);
      if (Number.isNaN(d.getTime())) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    if (dateFrom || dateTo) {
      doc.setFontSize(8);
      doc.text(`Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`, 280, 20, { align: 'right' });
    }

    const sortedMovements = [...periodMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const rows = sortedMovements.map(m => {
      const mat = materials.find(mt => mt.id === m.materialId);
      const who = resolveUserName(m.userId) || 'Sistema / Importação';

      let reference = '-';
      if (m.osId) {
        const osRef = oss.find(o => o.id === m.osId);
        reference = `OS: ${(osRef as any)?.number || m.osId}`;
      } else if (m.projectId) {
        const p = projects.find(proj => proj.id === m.projectId);
        reference = `Proj: ${p?.code || 'N/A'}`;
      }

      return [
        new Date(m.date).toLocaleString('pt-BR'),
        m.type,
        mat?.code || '???',
        mat?.description || 'Item excluído',
        m.quantity,
        m.type === 'OUT' || (m as any).type === 'PROJECT_OUT' ? who : '-',
        reference,
        (m.description || '').trim(),
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Data', 'Tipo', 'Código', 'Material', 'Qtd', 'Quem deu baixa', 'Ref. (OS/Proj)', 'Detalhes']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [50, 60, 70], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        1: { fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { fontStyle: 'bold', textColor: [20, 100, 200] },
      },
      didParseCell: data => {
        if (data.column.index === 1) {
          const type = data.cell.raw;
          if (type === 'IN') data.cell.styles.textColor = [0, 150, 0];
          if (type === 'OUT') data.cell.styles.textColor = [200, 0, 0];
        }
      },
    });

    doc.save(`Fluxo_Estoque_Detalhado_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ---------------------------
  // NOVO: Tarefas dos Executores (Admin)
  // - inclui pausas (legado + por executor)
  // - inclui materiais manuais (movements OUT com osId)
  // ---------------------------
  const getExecutorIdsFromOS = (os: OS): string[] => {
    const ids = new Set<string>();
    const legacy = (os as any).executorId;
    if (legacy) ids.add(legacy);
    const multi = (os as any).executorIds;
    if (Array.isArray(multi)) multi.forEach((x: string) => ids.add(x));
    return Array.from(ids).filter(Boolean);
  };

  const getPauseEntries = (os: OS) => {
    const legacy = Array.isArray((os as any).pauseHistory) ? (os as any).pauseHistory : [];
    const states = (os as any).executorStates || {};
    const perExec: any[] = [];
    Object.keys(states).forEach(execId => {
      const st = states[execId];
      if (Array.isArray(st?.pauseHistory)) perExec.push(...st.pauseHistory);
    });

    return [...legacy, ...perExec]
      .filter(x => x && x.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getMovementsForOS = (osId: string) => {
    return movements
      .filter(m => m.type === 'OUT' && m.osId === osId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const executorOptions = useMemo(() => {
    return users
      .filter(u => u.role === 'EXECUTOR')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const executorTasksRows = useMemo(() => {
    const { from, to } = parseRange();

    const rows = oss
      .filter(os => {
        // filtro executor
        const execIds = getExecutorIdsFromOS(os);
        const matchExecutor = selectedExecutor === 'ALL' ? true : execIds.includes(selectedExecutor);

        if (!matchExecutor) return false;

        // filtro contexto (proj/equip/build) reaproveita selects se você quiser
        if (selectedProject && (os as any).projectId !== selectedProject) return false;
        if (selectedEquipment && (os as any).equipmentId !== selectedEquipment) return false;
        if (selectedBuilding && (os as any).buildingId !== selectedBuilding) return false;

        // período: OS concluída no período OU teve pausa/retomada no período OU teve baixa (movimento OUT) no período
        const completedInPeriod = inRange((os as any).endTime);
        const startedInPeriod = inRange((os as any).startTime || (os as any).openDate);

        const pauses = getPauseEntries(os);
        const hasPauseInPeriod = pauses.some(p => {
          const d = new Date(p.timestamp);
          if (Number.isNaN(d.getTime())) return false;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });

        const movs = getMovementsForOS(os.id);
        const hasMovInPeriod = movs.some(m => {
          const d = new Date(m.date);
          if (Number.isNaN(d.getTime())) return false;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });

        // se não há período definido, mostra tudo
        const hasPeriod = !!dateFrom || !!dateTo;
        if (!hasPeriod) return true;

        return completedInPeriod || startedInPeriod || hasPauseInPeriod || hasMovInPeriod;
      })
      .map(os => {
        const execIds = getExecutorIdsFromOS(os);
        const execNames = execIds.length ? execIds.map(resolveUserName).join(', ') : '-';

        const pauses = getPauseEntries(os);
        const pausesInPeriod = pauses.filter(p => {
          const d = new Date(p.timestamp);
          if (Number.isNaN(d.getTime())) return false;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });

        const pausesSummary = pausesInPeriod
          .slice(0, 6)
          .map(p => {
            const who = resolveUserName(p.executorId || p.userId);
            const action = p.action || 'PAUSE';
            const reason = p.reason ? ` - ${p.reason}` : '';
            const worklog = p.worklogBeforePause ? ` | Feito: ${p.worklogBeforePause}` : '';
            return `${formatDateTimeBR(p.timestamp)} • ${who} • ${action}${reason}${worklog}`;
          })
          .join('\n') || '-';

        const movs = getMovementsForOS(os.id);
        const movsInPeriod = movs.filter(m => {
          const d = new Date(m.date);
          if (Number.isNaN(d.getTime())) return false;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });

        const manualMaterialsSummary = movsInPeriod
          .slice(0, 8)
          .map(m => {
            const who = resolveUserName(m.userId);
            const matLabel = resolveMaterialLabel(m.materialId);
            const qty = `${m.quantity}`;
            const desc = (m.description || '').trim();
            return `${formatDateTimeBR(m.date)} • ${who} • ${matLabel} • Qtd: ${qty}${desc ? ` • ${desc}` : ''}`;
          })
          .join('\n') || '-';

        // última atividade
        const ts: number[] = [];
        const tEnd = (os as any).endTime ? new Date((os as any).endTime).getTime() : NaN;
        if (!Number.isNaN(tEnd)) ts.push(tEnd);
        pauses.forEach(p => {
          const t = new Date(p.timestamp).getTime();
          if (!Number.isNaN(t)) ts.push(t);
        });
        movs.forEach(m => {
          const t = new Date(m.date).getTime();
          if (!Number.isNaN(t)) ts.push(t);
        });
        const lastTs = ts.length ? Math.max(...ts) : NaN;

        return {
          osId: os.id,
          osNumber: (os as any).number || '---',
          status: String((os as any).status || ''),
          executors: execNames,
          context: getContextLabel(os),
          description: (os as any).description || '',
          start: (os as any).startTime || (os as any).openDate,
          end: (os as any).endTime,
          executionDescription: ((os as any).executionDescription || '').trim(),
          pausesCount: pausesInPeriod.length,
          pausesSummary,
          manualMaterialsCount: movsInPeriod.length,
          manualMaterialsSummary,
          lastActivity: Number.isNaN(lastTs) ? '-' : new Date(lastTs).toLocaleString('pt-BR'),
        };
      })
      .sort((a, b) => {
        const ta = a.lastActivity === '-' ? 0 : new Date(a.lastActivity).getTime();
        const tb = b.lastActivity === '-' ? 0 : new Date(b.lastActivity).getTime();
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      });

    return rows;
  }, [
    oss,
    movements,
    users,
    materials,
    projects,
    buildings,
    equipments,
    selectedExecutor,
    dateFrom,
    dateTo,
    selectedProject,
    selectedEquipment,
    selectedBuilding,
  ]);

  const generateExecutorTasksReportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleString('pt-BR');

    doc.setFillColor(0, 21, 41);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO - TAREFAS DOS EXECUTORES', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    if (dateFrom || dateTo) {
      doc.setFontSize(8);
      doc.text(`Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`, 280, 20, { align: 'right' });
    }

    const body = executorTasksRows.map(r => ([
      r.osNumber,
      r.status,
      r.executors,
      r.context,
      r.description,
      formatDateTimeBR(r.start),
      formatDateTimeBR(r.end),
      r.executionDescription || '-',
      String(r.pausesCount),
      r.pausesSummary,
      String(r.manualMaterialsCount),
      r.manualMaterialsSummary,
    ]));

    autoTable(doc, {
      startY: 30,
      head: [[
        'OS',
        'Status',
        'Executor(es)',
        'Vínculo',
        'Descrição OS',
        'Início',
        'Fim',
        'Executado (descrição)',
        'Pausas (qtd)',
        'Histórico de Pausas (no período)',
        'Materiais (qtd)',
        'Materiais lançados (no período)',
      ]],
      body,
      styles: { fontSize: 7, cellPadding: 2, valign: 'top' },
      headStyles: { fillColor: [0, 21, 41], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 18 },
        2: { cellWidth: 32 },
        3: { cellWidth: 34 },
        4: { cellWidth: 38 },
        5: { cellWidth: 26 },
        6: { cellWidth: 26 },
        7: { cellWidth: 34 },
        8: { cellWidth: 16, halign: 'right' },
        9: { cellWidth: 55 },
        10: { cellWidth: 16, halign: 'right' },
        11: { cellWidth: 55 },
      },
    });

    doc.save(`Relatorio_Tarefas_Executores_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ---------------------------
  // (Opcional) Custos operacionais (Analítico) – mantém o seu que já existe
  // ---------------------------
  const generateCostCenterReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE CUSTOS OPERACIONAIS (OS & ATIVOS)', 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, 196, 16, { align: 'right' });

    let yPos = 35;

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. CUSTOS POR EDIFÍCIO (FACILITIES)', 14, yPos);
    yPos += 5;

    const buildingCosts = buildings
      .map(b => {
        const relatedOS = oss.filter(o => (o as any).buildingId === b.id && (o as any).status !== 'CANCELED');
        const totalCost = relatedOS.reduce((acc, os) => acc + (calculateOSCosts(os as any, materials as any, services as any).totalCost || 0), 0);
        return [b.name, b.city, relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
      })
      .sort((a, b) => {
        const valA = parseFloat(String(a[3]).replace('R$ ', '').replace('.', '').replace(',', '.'));
        const valB = parseFloat(String(b[3]).replace('R$ ', '').replace('.', '').replace(',', '.'));
        return valB - valA;
      });

    autoTable(doc, {
      startY: yPos,
      head: [['Edifício', 'Local', 'Qtd OS', 'Custo Total']],
      body: buildingCosts,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [50, 80, 120] },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    doc.text('2. CUSTOS POR EQUIPAMENTO (MANUTENÇÃO)', 14, yPos);
    yPos += 5;

    const equipmentCosts = equipments
      .map(eq => {
        const relatedOS = oss.filter(o => (o as any).equipmentId === eq.id && (o as any).status !== 'CANCELED');
        const totalCost = relatedOS.reduce((acc, os) => acc + (calculateOSCosts(os as any, materials as any, services as any).totalCost || 0), 0);
        return [eq.code, eq.name, (eq as any).status, relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
      })
      .sort((a, b) => {
        const valA = parseFloat(String(a[4]).replace('R$ ', '').replace('.', '').replace(',', '.'));
        const valB = parseFloat(String(b[4]).replace('R$ ', '').replace('.', '').replace(',', '.'));
        return valB - valA;
      });

    autoTable(doc, {
      startY: yPos,
      head: [['TAG', 'Equipamento', 'Status', 'Qtd OS', 'Custo Total']],
      body: equipmentCosts,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [120, 80, 50] },
      columnStyles: { 3: { halign: 'center' }, 4: { halign: 'right', fontStyle: 'bold' } },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.text('3. TOP 30 ORDENS DE SERVIÇO MAIS CARAS', 14, yPos);
    yPos += 5;

    const osCosts = oss
      .filter(o => (o as any).status !== 'CANCELED')
      .map(o => {
        const costs = calculateOSCosts(o as any, materials as any, services as any);
        return { ...(o as any), total: costs.totalCost || 0 };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 30)
      .map(o => [o.number, (o.description || '').substring(0, 40) + '...', o.type, `R$ ${formatCurrency(o.total)}`]);

    autoTable(doc, {
      startY: yPos,
      head: [['Número OS', 'Descrição', 'Tipo', 'Custo Total']],
      body: osCosts,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [80, 80, 80] },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
    });

    doc.save(`Custos_Operacionais_Analitico_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Central de Relatórios</h2>
          <p className="text-slate-500 text-base mt-1">Exportação de dados para análise gerencial.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('CARDS')}
            className={`h-10 px-4 rounded-lg font-bold text-sm border ${
              tab === 'CARDS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Relatórios
          </button>
          <button
            onClick={() => setTab('EXECUTOR_TASKS')}
            className={`h-10 px-4 rounded-lg font-bold text-sm border ${
              tab === 'EXECUTOR_TASKS'
                ? 'bg-clean-primary text-white border-clean-primary'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tarefas dos Executores
          </button>
        </div>
      </header>

      {/* Filtros gerais */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
          <i className="fas fa-filter text-blue-600"></i>
          Filtros de Período e Contexto
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data Inicial</label>
            <input
              type="date"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Data Final</label>
            <input
              type="date"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Equipamento</label>
            <select
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
              value={selectedEquipment}
              onChange={e => setSelectedEquipment(e.target.value)}
            >
              <option value="">Todos</option>
              {equipments.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} - {eq.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Edifício/Setor</label>
            <select
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
              value={selectedBuilding}
              onChange={e => setSelectedBuilding(e.target.value)}
            >
              <option value="">Todos</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} - {b.city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Projeto</label>
            <select
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
            >
              <option value="">Todos</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <i className="fas fa-info-circle text-blue-500"></i>
          <span>Deixe em branco para considerar todos os dados.</span>
        </div>
      </div>

      {/* TAB: CARDS (seus relatórios padrão) */}
      {tab === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MATERIAL REPORT */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-cubes"></i>
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Relatório de Materiais (Sintético)</h3>
            <p className="text-slate-500 text-sm mb-6">
              Detalhamento de consumo total de itens do almoxarifado e custo médio.
            </p>
            <button
              onClick={generateMaterialReport}
              className="mt-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 w-full justify-center"
            >
              <i className="fas fa-file-pdf"></i> Gerar PDF
            </button>
          </div>

          {/* PROJECT REPORT */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-folder-tree"></i>
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Relatório de Projetos (Consolidado)</h3>
            <p className="text-slate-500 text-sm mb-6">
              Custo total por projeto, incluindo materiais via OS, baixas diretas e serviços.
            </p>
            <button
              onClick={generateProjectReport}
              className="mt-auto px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 w-full justify-center"
            >
              <i className="fas fa-file-pdf"></i> Gerar PDF
            </button>
          </div>

          {/* STOCK FLOW REPORT */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Fluxo de Estoque Detalhado</h3>
            <p className="text-slate-500 text-sm mb-6">
              Entradas e saídas com identificação do responsável e contexto (OS/Projeto).
            </p>
            <button
              onClick={generateStockFlowReport}
              className="mt-auto px-6 py-3 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 w-full justify-center"
            >
              <i className="fas fa-file-pdf"></i> Gerar PDF
            </button>
          </div>

          {/* COST CENTER REPORT */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-coins"></i>
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">Custos Operacionais (Analítico)</h3>
            <p className="text-slate-500 text-sm mb-6">
              Gastos segmentados por Edifício, Equipamento e Ranking de OS.
            </p>
            <button
              onClick={generateCostCenterReport}
              className="mt-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center gap-2 w-full justify-center"
            >
              <i className="fas fa-file-pdf"></i> Gerar PDF
            </button>
          </div>
        </div>
      )}

      {/* TAB: EXECUTOR_TASKS (VISUALIZAÇÃO ADMIN + PDF) */}
      {tab === 'EXECUTOR_TASKS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Tarefas dos Executores</h3>
                <p className="text-sm text-slate-600">
                  Inclui: OS executadas, histórico de pausas e materiais adicionados manualmente (baixas OUT vinculadas na OS).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Executor</label>
                  <select
                    className="h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 min-w-[240px]"
                    value={selectedExecutor}
                    onChange={e => setSelectedExecutor(e.target.value)}
                  >
                    <option value="ALL">Todos</option>
                    {executorOptions.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={generateExecutorTasksReportPDF}
                  className="h-11 px-5 bg-clean-primary text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-file-pdf"></i> Exportar PDF
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">Registros encontrados</p>
                <p className="text-xs text-slate-500">{executorTasksRows.length} OS com atividade</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-[11px] uppercase font-black tracking-wider">
                    <th className="text-left px-4 py-3">OS</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Executor(es)</th>
                    <th className="text-left px-4 py-3">Vínculo</th>
                    <th className="text-left px-4 py-3">Descrição</th>
                    <th className="text-left px-4 py-3">Início</th>
                    <th className="text-left px-4 py-3">Fim</th>
                    <th className="text-left px-4 py-3">Executado</th>
                    <th className="text-center px-4 py-3">Pausas</th>
                    <th className="text-center px-4 py-3">Materiais</th>
                    <th className="text-left px-4 py-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {executorTasksRows.map(r => (
                    <tr key={r.osId} className="hover:bg-slate-50 align-top">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{r.osNumber}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{r.executors}</td>
                      <td className="px-4 py-3 text-slate-700">{r.context}</td>
                      <td className="px-4 py-3 text-slate-700">{r.description}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTimeBR(r.start)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTimeBR(r.end)}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-pre-wrap">
                        {r.executionDescription || <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-slate-800">{r.pausesCount}</td>
                      <td className="px-4 py-3 text-center font-black text-slate-800">{r.manualMaterialsCount}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <details>
                          <summary className="cursor-pointer text-xs font-black text-slate-500 uppercase">
                            Ver pausas e materiais
                          </summary>
                          <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                              <p className="text-[11px] font-black text-slate-600 uppercase mb-2">Pausas (no período)</p>
                              <pre className="text-[11px] text-slate-700 whitespace-pre-wrap">{r.pausesSummary}</pre>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                              <p className="text-[11px] font-black text-slate-600 uppercase mb-2">Materiais (no período)</p>
                              <pre className="text-[11px] text-slate-700 whitespace-pre-wrap">{r.manualMaterialsSummary}</pre>
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}

                  {executorTasksRows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-10 text-center text-slate-400 italic">
                        Nenhum registro encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 text-xs text-slate-500 border-t border-slate-100">
              Materiais exibidos = movimentações <b>OUT</b> do almoxarifado vinculadas em <b>osId</b> (inclui lançamentos manuais do executor).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;