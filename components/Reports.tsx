import React, { useMemo, useState } from 'react';
import { Material, Project, StockMovement, OS, ServiceType, User, Building, Equipment, OSStatus } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateProjectCosts, calculateOSCosts, groupCostsByCompany, buildExecutorHoursRows } from '../services/engine';

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

type PauseEntry = {
  timestamp: string;
  reason?: string;
  userId: string;
  executorId?: string;
  action: 'PAUSE' | 'RESUME';
  worklogBeforePause?: string;
};

type ExecutorState = {
  status?: 'OPEN' | 'IN_PROGRESS' | 'PAUSED' | 'DONE';
  startedAt?: string;
  currentPauseReason?: string;
  pauseHistory?: PauseEntry[];
};

type ManualMaterialEntry = {
  description: string;
  quantity: number;
  createdAt: string;
  userId: string;
  executorId?: string;
};

type OSAny = OS & {
  executorIds?: string[];
  executorId?: string;
  executorStates?: Record<string, ExecutorState>;
  manualMaterialsByExecutor?: Record<string, ManualMaterialEntry[]>;
};

const Reports: React.FC<Props> = ({
  materials,
  projects,
  movements,
  oss,
  services,
  users = [],
  buildings = [],
  equipments = []
}) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatPeriodLabel = () => {
    if (!dateFrom && !dateTo) return 'Período: Início até Hoje';
    return `Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`;
  };

  const applyFilters = (data: any[]) => {
    let filtered = [...data];

    if (dateFrom || dateTo) {
      filtered = filtered.filter((item: any) => {
        const itemDate = new Date(item.openDate || item.date || item.startDate || item.startTime || item.createdAt);
        if (dateFrom && itemDate < new Date(dateFrom)) return false;
        if (dateTo && itemDate > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }

    if (selectedEquipment) {
      filtered = filtered.filter((item: any) => item.equipmentId === selectedEquipment);
    }

    if (selectedBuilding) {
      filtered = filtered.filter((item: any) => item.buildingId === selectedBuilding);
    }

    if (selectedProject) {
      filtered = filtered.filter((item: any) => item.projectId === selectedProject);
    }

    return filtered;
  };

  const filteredOSs = useMemo(() => applyFilters(oss as any[]), [oss, dateFrom, dateTo, selectedEquipment, selectedBuilding, selectedProject]);
  const filteredMovements = useMemo(() => applyFilters(movements as any[]), [movements, dateFrom, dateTo, selectedEquipment, selectedBuilding, selectedProject]);
  const filteredProjects = useMemo(() => {
    if (!selectedProject) return projects;
    return projects.filter(p => p.id === selectedProject);
  }, [projects, selectedProject]);

  const generateMaterialReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE GASTOS POR MATERIAL', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 196, 16, { align: 'right' });

    doc.setFontSize(8);
    doc.text(formatPeriodLabel(), 196, 20, { align: 'right' });

    const materialStats = materials
      .map(mat => {
        const outMovements = filteredMovements.filter((m: any) => m.materialId === mat.id && m.type === 'OUT');
        const totalQtyOut = outMovements.reduce((acc: number, m: any) => acc + (m.quantity || 0), 0);
        const totalCostOut = totalQtyOut * (mat.unitCost || 0);
        return {
          code: mat.code,
          description: mat.description,
          unit: mat.unit,
          qtyOut: totalQtyOut,
          unitCost: mat.unitCost || 0,
          totalCost: totalCostOut
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
      `R$ ${formatCurrency(i.totalCost)}`
    ]);

    rows.push(['', 'TOTAL GERAL GASTO', '', '', `R$ ${formatCurrency(totalGeneral)}`]);

    autoTable(doc, {
      startY: 30,
      head: [['Código', 'Descrição', 'Qtd Consumida', 'Custo Médio', 'Custo Total']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [71, 122, 127] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`Relatorio_Materiais_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateProjectReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('pt-BR');

    doc.setFillColor(71, 122, 127);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE CUSTOS POR PROJETO (OS + BAIXA DIRETA)', 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    doc.setFontSize(8);
    doc.text(formatPeriodLabel(), 280, 20, { align: 'right' });

    const projectStats = filteredProjects.map(proj => {
      const osCosts = calculateProjectCosts(proj, filteredOSs, materials, services);

      const directMovements = filteredMovements.filter((m: any) => m.projectId === proj.id && m.type === 'OUT');
      const directMaterialCost = directMovements.reduce((acc: number, m: any) => {
        const mat = materials.find(mt => mt.id === m.materialId);
        return acc + (m.quantity || 0) * ((mat?.unitCost || 0) as number);
      }, 0);

      const totalReal = (osCosts.totalReal || 0) + directMaterialCost;

      return {
        code: proj.code,
        desc: proj.description,
        status: (proj as any).status,
        budget: (proj as any).estimatedValue || 0,
        osMaterial: osCosts.totalMaterials || 0,
        directMaterial: directMaterialCost,
        services: osCosts.totalServices || 0,
        total: totalReal
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
      `R$ ${formatCurrency(p.total)}`
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
        7: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`Relatorio_Projetos_Consolidado_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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

    doc.setFontSize(8);
    doc.text(formatPeriodLabel(), 280, 20, { align: 'right' });

    const sortedMovements = [...filteredMovements].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const rows = sortedMovements.map((m: any) => {
      const mat = materials.find(mt => mt.id === m.materialId);
      const userName = users.find(u => u.id === m.userId)?.name || 'Sistema / Importação';

      let reference = '-';
      if (m.osId) {
        const osRef = (oss as any[]).find((o: any) => o.id === m.osId);
        reference = `OS: ${osRef?.number || m.osId}`;
      } else if (m.projectId) {
        const p = projects.find(proj => proj.id === m.projectId);
        reference = `Proj: ${p?.code || 'N/A'}`;
      }

      return [
        new Date(m.date).toLocaleString(),
        m.type,
        mat?.code || '???',
        mat?.description || 'Item excluído',
        m.quantity,
        (m.type === 'OUT' || m.type === 'PROJECT_OUT') ? userName : '-',
        reference,
        m.description
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
        5: { fontStyle: 'bold', textColor: [20, 100, 200] }
      },
      didParseCell: (data) => {
        if (data.column.index === 1) {
          const type = data.cell.raw;
          if (type === 'IN') data.cell.styles.textColor = [0, 150, 0];
          if (type === 'OUT') data.cell.styles.textColor = [200, 0, 0];
        }
      }
    });

    doc.save(`Fluxo_Estoque_Detalhado_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
        const relatedOS = (filteredOSs as any[]).filter((o: any) => o.buildingId === b.id && o.status !== 'CANCELED');
        const totalCost = relatedOS.reduce((acc: number, os: any) => acc + (calculateOSCosts(os, materials, services).totalCost || 0), 0);
        return [b.name, (b as any).city, relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
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
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    doc.text('2. CUSTOS POR EQUIPAMENTO (MANUTENÇÃO)', 14, yPos);
    yPos += 5;

    const equipmentCosts = equipments
      .map(eq => {
        const relatedOS = (filteredOSs as any[]).filter((o: any) => o.equipmentId === eq.id && o.status !== 'CANCELED');
        const totalCost = relatedOS.reduce((acc: number, os: any) => acc + (calculateOSCosts(os, materials, services).totalCost || 0), 0);
        return [(eq as any).code, eq.name, (eq as any).status, relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
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
      columnStyles: { 3: { halign: 'center' }, 4: { halign: 'right', fontStyle: 'bold' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.text('3. TOP 30 ORDENS DE SERVIÇO MAIS CARAS', 14, yPos);
    yPos += 5;

    const osCosts = (filteredOSs as any[])
      .filter((o: any) => o.status !== 'CANCELED')
      .map((o: any) => {
        const costs = calculateOSCosts(o, materials, services);
        return { ...o, total: costs.totalCost || 0 };
      })
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 30)
      .map((o: any) => [
        o.number,
        (o.description || '').substring(0, 40) + '...',
        o.type,
        `R$ ${formatCurrency(o.total)}`
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Número OS', 'Descrição', 'Tipo', 'Custo Total']],
      body: osCosts,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [80, 80, 80] },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
    });

    doc.save(`Custos_Operacionais_Analitico_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ✅ JÁ ARRUMADO: funções que estavam fora do componente e quebravam (dateFrom/dateTo undefined)
  const generateExecutorHoursReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleString('pt-BR');

    doc.setFillColor(50, 60, 70);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE HORAS POR EXECUTOR', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    doc.setFontSize(8);
    doc.text(formatPeriodLabel(), 280, 20, { align: 'right' });

    const rowsData = buildExecutorHoursRows(filteredOSs as any, users || [], dateFrom, dateTo).map((r: any) => ([
      r.executorName,
      r.osNumber,
      r.startTime ? new Date(r.startTime).toLocaleString('pt-BR') : '-',
      r.endTime ? new Date(r.endTime).toLocaleString('pt-BR') : '-',
      Number(r.grossHours || 0).toFixed(2),
      Number(r.pausedHours || 0).toFixed(2),
      Number(r.netHours || 0).toFixed(2),
    ]));

    autoTable(doc, {
      startY: 30,
      head: [['Executor', 'OS', 'Início', 'Fim', 'Horas Brutas', 'Horas Pausadas', 'Horas Líquidas']],
      body: rowsData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`relatorio_horas_executor_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const generateCompanyCostReport = () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    const today = new Date().toLocaleString('pt-BR');

    doc.setFillColor(50, 60, 70);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE CUSTO POR EMPRESA', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 196, 16, { align: 'right' });

    doc.setFontSize(8);
    doc.text(formatPeriodLabel(), 196, 20, { align: 'right' });

    const grouped = groupCostsByCompany(filteredOSs as any, materials, services, equipments || [], projects);

    const rows = grouped.map((g: any) => ([
      g.company,
      `R$ ${formatCurrency(g.material)}`,
      `R$ ${formatCurrency(g.service)}`,
      `R$ ${formatCurrency(g.total)}`
    ]));

    autoTable(doc, {
      startY: 30,
      head: [['Empresa', 'Materiais', 'Serviços', 'Total']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`relatorio_custo_empresa_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ✅ NOVO: Relatório que mostra TAREFAS + PAUSAS + MATERIAIS MANUAIS POR EXECUTOR
  const generateExecutorTasksAndManualMaterialsReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleString('pt-BR');

    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE EXECUÇÃO POR EXECUTOR (TAREFAS + PAUSAS + MATERIAIS)', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    doc.setFontSize(8);
    doc.text(formatPeriodLabel(), 280, 20, { align: 'right' });

    const getUserName = (key: string) => {
      const u = users.find(x => (x as any).id === key || (x as any).email === key);
      return u?.name || key;
    };

    const getExecutorKeys = (osAny: OSAny) => {
      const ids =
        (osAny.executorIds && osAny.executorIds.length > 0)
          ? osAny.executorIds
          : (osAny.executorId ? [osAny.executorId] : []);
      return Array.from(new Set(ids));
    };

    const rows: any[] = [];

    (filteredOSs as any as OSAny[])
      .filter(o => o.status !== OSStatus.CANCELED)
      .forEach((osAny) => {
        const keys = getExecutorKeys(osAny);
        const number = (osAny as any).number;
        const desc = (osAny as any).description || '';
        const status = (osAny as any).status;

        keys.forEach((k) => {
          const st = osAny.executorStates?.[k];
          const pauses = (st?.pauseHistory || []) as PauseEntry[];

          const pauseCount = pauses.filter(p => p.action === 'PAUSE').length;

          const worklogs = pauses
            .filter(p => p.action === 'PAUSE' && p.worklogBeforePause)
            .map(p => `• ${new Date(p.timestamp).toLocaleString('pt-BR')}: ${p.worklogBeforePause}`)
            .join('\n');

          const mats = (osAny.manualMaterialsByExecutor?.[k] || []) as ManualMaterialEntry[];
          const matsTxt = mats.length
            ? mats.map(m => `• ${m.description} (${m.quantity})`).join('\n')
            : '';

          rows.push([
            getUserName(k),
            number,
            desc.substring(0, 60),
            status,
            st?.startedAt ? new Date(st.startedAt).toLocaleString('pt-BR') : ((osAny as any).startTime ? new Date((osAny as any).startTime).toLocaleString('pt-BR') : '-'),
            (osAny as any).endTime ? new Date((osAny as any).endTime).toLocaleString('pt-BR') : '-',
            pauseCount,
            worklogs || '-',
            matsTxt || '-'
          ]);
        });
      });

    if (rows.length === 0) {
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text('Nenhum dado encontrado para os filtros informados.', 14, 40);
      doc.save(`relatorio_execucao_executor_${new Date().toISOString().slice(0, 10)}.pdf`);
      return;
    }

    autoTable(doc, {
      startY: 30,
      head: [[
        'Executor',
        'OS',
        'Descrição',
        'Status',
        'Início (Exec)',
        'Fim (OS)',
        'Qtd Pausas',
        'O que foi feito (antes da pausa)',
        'Materiais manuais'
      ]],
      body: rows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 18 },
        2: { cellWidth: 55 },
        3: { cellWidth: 18 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28 },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 55 },
        8: { cellWidth: 40 }
      }
    });

    doc.save(`relatorio_execucao_executor_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Central de Relatórios</h2>
        <p className="text-slate-500 text-base mt-1">Exportação de dados para análise gerencial.</p>
      </header>

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
                <option key={eq.id} value={eq.id}>{eq.name} - {(eq as any).code}</option>
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
                <option key={b.id} value={b.id}>{b.name} - {(b as any).city}</option>
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
                <option key={p.id} value={p.id}>{p.code} - {p.description}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <i className="fas fa-info-circle text-blue-500"></i>
          <span>Os filtros serão aplicados aos relatórios que você gerar. Deixe em branco para considerar todos os dados.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MATERIAL REPORT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-cubes"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Relatório de Materiais (Sintético)</h3>
          <p className="text-slate-500 text-sm mb-6">Detalhamento de consumo total de itens do almoxarifado e custo médio.</p>
          <button onClick={generateMaterialReport} className="mt-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 w-full justify-center">
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* PROJECT REPORT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-folder-tree"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Relatório de Projetos (Consolidado)</h3>
          <p className="text-slate-500 text-sm mb-6">Custo total por projeto (Capex), incluindo materiais via OS, baixas diretas e serviços.</p>
          <button onClick={generateProjectReport} className="mt-auto px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 w-full justify-center">
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* STOCK FLOW */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-exchange-alt"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Fluxo de Estoque Detalhado</h3>
          <p className="text-slate-500 text-sm mb-6">Entradas e saídas com identificação do <strong>responsável pela baixa</strong> e contexto (OS/Proj).</p>
          <button onClick={generateStockFlowReport} className="mt-auto px-6 py-3 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 w-full justify-center">
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* COST CENTERS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-coins"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Custos Operacionais (Analítico)</h3>
          <p className="text-slate-500 text-sm mb-6">Gastos por <strong>Edifício</strong>, <strong>Equipamento</strong> e ranking de <strong>OS</strong>.</p>
          <button onClick={generateCostCenterReport} className="mt-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center gap-2 w-full justify-center">
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* HOURS BY EXECUTOR */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-user-clock"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Horas por Executor</h3>
          <p className="text-slate-500 text-sm mb-6">Consolidado de início/fim, horas pausadas e horas líquidas (por executor).</p>
          <button onClick={generateExecutorHoursReport} className="mt-auto px-6 py-3 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors flex items-center gap-2 w-full justify-center">
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* COST BY COMPANY */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-building"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Custo por Empresa</h3>
          <p className="text-slate-500 text-sm mb-6">Totais segmentados por empresa (materiais, serviços e total).</p>
          <button onClick={generateCompanyCostReport} className="mt-auto px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 w-full justify-center">
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* ✅ NOVO: EXECUTOR TASKS + MANUAL MATERIALS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group md:col-span-2">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-clipboard-check"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Execução por Executor (Tarefas + Pausas + Materiais)</h3>
          <p className="text-slate-500 text-sm mb-6">
            Lista todas as tarefas realizadas por executor e inclui <strong>pausas</strong> (com “o que foi feito”) e <strong>materiais manuais</strong>.
          </p>
          <button onClick={generateExecutorTasksAndManualMaterialsReport} className="mt-auto px-6 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-colors flex items-center gap-2 w-full justify-center">
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;