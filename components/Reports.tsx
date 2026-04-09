import React, { useState } from 'react';
import { Material, Project, StockMovement, OS, ServiceType, User, Building, Equipment, OSStatus } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  calculateProjectCosts,
  calculateOSCosts,
  groupCostsByCompany,
  groupCostsByCompanyWithBreakdown,
  buildExecutorHoursRows,
} from '../services/engine';

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

type ExecutorHoursRow = {
  executorName: string;
  executorKey: string; // id/email
  osId?: string;
  osNumber: string;
  startTime?: string | null;
  endTime?: string | null;
  grossHours: number;
  pausedHours: number;
  netHours: number;
};

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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedExecutor, setSelectedExecutor] = useState<string>('');

  const formatCurrency = (val: number) =>
    (Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const parseAnyDate = (v: any): Date | null => {
    try {
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    } catch {
      return null;
    }
  };

  const isWithinPeriod = (d: Date | null) => {
    if (!d) return true;
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime()) && d < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      if (!Number.isNaN(to.getTime()) && d > to) return false;
    }
    return true;
  };

  const applyFilters = (data: any[]) => {
    let filtered = [...data];

    if (dateFrom || dateTo) {
      filtered = filtered.filter((item: any) => {
        const itemDate =
          parseAnyDate(item.openDate) ||
          parseAnyDate(item.date) ||
          parseAnyDate(item.startDate) ||
          parseAnyDate(item.startTime) ||
          parseAnyDate(item.endTime) ||
          parseAnyDate(item.limitDate) ||
          parseAnyDate(item.createdAt);

        return isWithinPeriod(itemDate);
      });
    }

    if (selectedEquipment) filtered = filtered.filter((item: any) => item.equipmentId === selectedEquipment);
    if (selectedBuilding) filtered = filtered.filter((item: any) => item.buildingId === selectedBuilding);
    if (selectedProject) filtered = filtered.filter((item: any) => item.projectId === selectedProject);

    return filtered;
  };

  // -----------------------------
  // Helpers (Executor)
  // -----------------------------
  const getExecutorName = (idOrEmail?: string) => {
    if (!idOrEmail) return 'Executor';
    const u = users.find(x => x.id === idOrEmail) || users.find(x => x.email === idOrEmail);
    return u?.name || idOrEmail;
  };

  const normalizeExecutorKey = (idOrEmail: string) => {
    const u = users.find(x => x.id === idOrEmail) || users.find(x => x.email === idOrEmail);
    return { id: u?.id || idOrEmail, email: u?.email || idOrEmail };
  };

  const isOsForExecutor = (os: OS, executorIdOrEmail: string) => {
    if (!executorIdOrEmail) return true;
    const { id, email } = normalizeExecutorKey(executorIdOrEmail);
    const legacy = (os as any).executorId === id || (os as any).executorId === email;
    const multi = ((os as any).executorIds || []).includes(id) || ((os as any).executorIds || []).includes(email);
    return legacy || multi;
  };

  const getExecutorPauseText = (os: OS, executorIdOrEmail: string) => {
    const anyOs: any = os as any;
    const { id, email } = normalizeExecutorKey(executorIdOrEmail);

    const states = anyOs.executorStates || {};
    const st = states[id] || states[email];
    const pauseHistory = (st?.pauseHistory || []) as any[];

    const legacy = (anyOs.pauseHistory || []) as any[];

    const entries = (pauseHistory.length ? pauseHistory : legacy).slice(-10);
    if (!entries.length) return '-';

    return entries
      .map((p: any) => {
        const d = p.timestamp ? new Date(p.timestamp).toLocaleString('pt-BR') : '';
        const reason = p.reason || '';
        const act = p.action || '';
        const worklog = p.worklogBeforePause ? ` | Feito: ${p.worklogBeforePause}` : '';
        return `${d} ${act} - ${reason}${worklog}`.trim();
      })
      .join('\n');
  };

  const getExecutorManualMaterials = (os: OS, executorIdOrEmail: string) => {
    const anyOs: any = os as any;
    const { id, email } = normalizeExecutorKey(executorIdOrEmail);

    const v1 = anyOs.executorManualMaterials?.[id] || anyOs.executorManualMaterials?.[email];
    if (Array.isArray(v1)) return v1;

    const v2 = anyOs.executorAddedMaterials?.[id] || anyOs.executorAddedMaterials?.[email];
    if (Array.isArray(v2)) return v2;

    const v3 = anyOs.manualMaterials;
    if (Array.isArray(v3)) {
      const list = v3.filter((m: any) => m.executorId === id || m.executorId === email);
      if (list.length) return list;
    }

    const guess = anyOs.manualItems || anyOs.manualStock || anyOs.manualMaterialsByExecutor;
    if (Array.isArray(guess)) {
      const list = guess.filter((m: any) => m.executorId === id || m.executorId === email);
      if (list.length) return list;
    }

    return [];
  };

  const getEvidence = (os: OS): string | null => {
    const anyOs: any = os as any;
    return (
      anyOs.completionImage ||
      anyOs.completionImageUrl ||
      anyOs.evidenceImage ||
      anyOs.evidenceUrl ||
      anyOs.image ||
      null
    );
  };

  const loadImageAsDataUrl = (src: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        if (!src) return resolve(null);
        if (src.startsWith('data:image/')) return resolve(src);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      } catch {
        resolve(null);
      }
    });
  };

  const addHeader = (doc: jsPDF, title: string, subtitleRight?: string) => {
    const pageW = (doc as any).internal?.pageSize?.getWidth?.() || 210;

    doc.setFillColor(50, 60, 70);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (subtitleRight) doc.text(subtitleRight, pageW - 14, 16, { align: 'right' });

    if (dateFrom || dateTo) {
      doc.setFontSize(8);
      doc.text(`Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`, pageW - 14, 20, { align: 'right' });
    }

    doc.setTextColor(0, 0, 0);
  };

  // -----------------------------
  // ✅ Fallback: cálculo de horas por executor (se engine não retornar)
  // -----------------------------
  const hoursBetween = (a?: string | null, b?: string | null) => {
    const da = parseAnyDate(a);
    const db = parseAnyDate(b);
    if (!da || !db) return 0;
    const ms = db.getTime() - da.getTime();
    return ms > 0 ? ms / 36e5 : 0;
  };

  const sumPausedHoursFromHistory = (history: any[]) => {
    // soma PAUSE -> RESUME, se faltar RESUME usa "agora"
    let paused = 0;
    let lastPause: Date | null = null;

    for (const ev of history || []) {
      const ts = parseAnyDate(ev?.timestamp);
      if (!ts) continue;

      const action = String(ev?.action || '').toUpperCase();
      if (action === 'PAUSE') lastPause = ts;
      if (action === 'RESUME' && lastPause) {
        paused += (ts.getTime() - lastPause.getTime()) / 36e5;
        lastPause = null;
      }
    }

    if (lastPause) {
      paused += (new Date().getTime() - lastPause.getTime()) / 36e5;
    }

    return paused > 0 ? paused : 0;
  };

  const buildExecutorHoursRowsFallback = (inputOS: OS[]): ExecutorHoursRow[] => {
    const filteredOS = applyFilters(inputOS);

    const execKeys = (() => {
      if (selectedExecutor) {
        const { id, email } = normalizeExecutorKey(selectedExecutor);
        return Array.from(new Set([id, email].filter(Boolean)));
      }
      const s = new Set<string>();
      filteredOS.forEach(o => {
        const anyOs: any = o as any;
        if (anyOs.executorId) s.add(anyOs.executorId);
        (anyOs.executorIds || []).forEach((x: any) => x && s.add(x));
      });
      return Array.from(s);
    })();

    const rows: ExecutorHoursRow[] = [];

    for (const execKey of execKeys) {
      const osForExec = filteredOS.filter(o => isOsForExecutor(o, execKey));

      for (const os of osForExec) {
        const anyOs: any = os as any;

        // start/end: usa startTime/endTime; fallback openDate/now
        const start = anyOs.startTime || anyOs.openDate || null;
        const end = anyOs.endTime || (anyOs.status === OSStatus.COMPLETED ? anyOs.endTime : null);

        // se não tem endTime mas está concluída, ainda assim tenta endTime; se não tiver, usa "agora" para relatório de andamento
        const safeEnd = end || (anyOs.status === OSStatus.IN_PROGRESS || anyOs.status === OSStatus.PAUSED ? new Date().toISOString() : null);

        // pausa por executor (novo) ou global (legado)
        const { id, email } = normalizeExecutorKey(execKey);
        const states = anyOs.executorStates || {};
        const st = states[id] || states[email];
        const pauseHistory = (st?.pauseHistory || []) as any[];
        const legacyHistory = (anyOs.pauseHistory || []) as any[];

        const gross = hoursBetween(start, safeEnd);
        const paused = sumPausedHoursFromHistory(pauseHistory.length ? pauseHistory : legacyHistory);
        const net = Math.max(gross - paused, 0);

        // aplica filtro por período com base no endTime (se tiver) senão start/open
        const dRef = parseAnyDate(anyOs.endTime) || parseAnyDate(anyOs.startTime) || parseAnyDate(anyOs.openDate) || null;
        if (!isWithinPeriod(dRef)) continue;

        rows.push({
          executorName: getExecutorName(execKey),
          executorKey: execKey,
          osId: anyOs.id,
          osNumber: anyOs.number || anyOs.osNumber || anyOs.id || '-',
          startTime: start,
          endTime: anyOs.endTime || null,
          grossHours: Number.isFinite(gross) ? gross : 0,
          pausedHours: Number.isFinite(paused) ? paused : 0,
          netHours: Number.isFinite(net) ? net : 0,
        });
      }
    }

    // ordena por executor e data
    rows.sort((a, b) => {
      const n = (a.executorName || '').localeCompare(b.executorName || '');
      if (n !== 0) return n;
      const ta = parseAnyDate(a.startTime)?.getTime() || 0;
      const tb = parseAnyDate(b.startTime)?.getTime() || 0;
      return tb - ta;
    });

    return rows;
  };

  const getExecutorHoursRowsSmart = (): ExecutorHoursRow[] => {
    // 1) tenta engine
    try {
      const engineRows = (buildExecutorHoursRows as any)?.(oss, users || [], dateFrom, dateTo) || [];
      const normalized: ExecutorHoursRow[] = (engineRows || []).map((r: any) => ({
        executorName: r.executorName || r.name || 'Executor',
        executorKey: r.executorId || r.executorKey || r.executorEmail || r.executorName || 'executor',
        osId: r.osId,
        osNumber: r.osNumber || r.number || '-',
        startTime: r.startTime || null,
        endTime: r.endTime || null,
        grossHours: Number(r.grossHours || 0),
        pausedHours: Number(r.pausedHours || 0),
        netHours: Number(r.netHours || 0),
      }));

      // filtra por executor selecionado (se engine não filtra)
      const filteredByExec = selectedExecutor
        ? normalized.filter(row => {
            const { id, email } = normalizeExecutorKey(selectedExecutor);
            return row.executorKey === id || row.executorKey === email || row.executorKey === selectedExecutor;
          })
        : normalized;

      if (filteredByExec.length) return filteredByExec;
    } catch {
      // ignora e usa fallback
    }

    // 2) fallback compatível com seu modelo atual
    return buildExecutorHoursRowsFallback(oss);
  };

  // -----------------------------
  // Relatórios existentes
  // -----------------------------
  const generateMaterialReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    const filteredMovements = applyFilters(movements);

    addHeader(doc, 'RELATÓRIO DE GASTOS POR MATERIAL', `Gerado em: ${today}`);

    const materialStats = materials
      .map(mat => {
        const outMovements = filteredMovements.filter(m => m.materialId === mat.id && m.type === 'OUT');
        const totalQtyOut = outMovements.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
        const totalCostOut = totalQtyOut * (Number(mat.unitCost) || 0);
        return {
          code: mat.code,
          description: mat.description,
          unit: mat.unit,
          qtyOut: totalQtyOut,
          unitCost: Number(mat.unitCost) || 0,
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
      headStyles: { fillColor: [50, 60, 70] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    doc.save(`Relatorio_Materiais_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateProjectReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('pt-BR');

    const filteredProjects = selectedProject ? projects.filter(p => p.id === selectedProject) : projects;
    const filteredOSs = applyFilters(oss);
    const filteredMovements = applyFilters(movements);

    addHeader(doc, 'RELATÓRIO DE CUSTOS POR PROJETO (OS + BAIXA DIRETA)', `Gerado em: ${today}`);

    const projectStats = filteredProjects.map(proj => {
      const osCosts = calculateProjectCosts(proj, filteredOSs, materials, services);

      const directMovements = filteredMovements.filter(m => m.projectId === proj.id && m.type === 'OUT');
      const directMaterialCost = directMovements.reduce((acc, m) => {
        const mat = materials.find(mt => mt.id === m.materialId);
        return acc + (Number(m.quantity) || 0) * (Number(mat?.unitCost) || 0);
      }, 0);

      const totalReal = (Number(osCosts.totalReal) || 0) + directMaterialCost;
      const totalMaterials = (Number(osCosts.totalMaterials) || 0) + directMaterialCost;

      return {
        code: proj.code,
        desc: proj.description,
        status: proj.status,
        budget: Number(proj.estimatedValue) || 0,
        osMaterial: totalMaterials,
        directMaterial: directMaterialCost,
        services: Number(osCosts.totalServices) || 0,
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
      headStyles: { fillColor: [50, 60, 70] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold', textColor: [100, 100, 100] },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    doc.save(`Relatorio_Projetos_Consolidado_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateStockFlowReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('pt-BR');

    addHeader(doc, 'FLUXO DE ESTOQUE DETALHADO (ENTRADA / SAÍDA)', `Gerado em: ${today}`);

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    const periodMovements = movements.filter(m => {
      const d = parseAnyDate(m.date);
      if (!d) return true;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    const sortedMovements = [...periodMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const rows = sortedMovements.map(m => {
      const mat = materials.find(mt => mt.id === m.materialId);
      const userName = users.find(u => u.id === m.userId)?.name || 'Sistema / Importação';

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
        Number(m.quantity) || 0,
        m.type === 'OUT' || m.type === 'PROJECT_OUT' ? userName : '-',
        reference,
        (m as any).description || '-',
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
      didParseCell: (data) => {
        if (data.column.index === 1) {
          const type = data.cell.raw;
          if (type === 'IN') data.cell.styles.textColor = [0, 150, 0];
          if (type === 'OUT') data.cell.styles.textColor = [200, 0, 0];
        }
      },
    });

    doc.save(`Fluxo_Estoque_Detalhado_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateCostCenterReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    addHeader(doc, 'RELATÓRIO DE CUSTOS OPERACIONAIS (OS & ATIVOS)', `Gerado em: ${today}`);

    let yPos = 35;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. CUSTOS POR EDIFÍCIO (FACILITIES)', 14, yPos);
    yPos += 5;

    const buildingCosts = buildings
      .map(b => {
        const relatedOS = oss.filter(o => (o as any).buildingId === b.id && (o as any).status !== 'CANCELED');
        const totalCost = relatedOS.reduce((acc, os) => acc + (calculateOSCosts as any)(os, materials, services).totalCost, 0);
        return [b.name, b.city, relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
      })
      .sort((a, b) => {
        const valA = parseFloat(String(a[3]).replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        const valB = parseFloat(String(b[3]).replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        return valB - valA;
      });

    autoTable(doc, {
      startY: yPos,
      head: [['Edifício', 'Local', 'Qtd OS', 'Custo Total']],
      body: buildingCosts as any[],
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
        const totalCost = relatedOS.reduce((acc, os) => acc + (calculateOSCosts as any)(os, materials, services).totalCost, 0);
        return [eq.code, eq.name, (eq as any).status || '-', relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
      })
      .sort((a, b) => {
        const valA = parseFloat(String(a[4]).replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        const valB = parseFloat(String(b[4]).replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        return valB - valA;
      });

    autoTable(doc, {
      startY: yPos,
      head: [['TAG', 'Equipamento', 'Status', 'Qtd OS', 'Custo Total']],
      body: equipmentCosts as any[],
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
        const costs = (calculateOSCosts as any)(o, materials, services);
        return { ...o, total: costs.totalCost };
      })
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 30)
      .map((o: any) => [
        o.number,
        (o.description || '').substring(0, 40) + '...',
        o.type,
        `R$ ${formatCurrency(o.total)}`,
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Número OS', 'Descrição', 'Tipo', 'Custo Total']],
      body: osCosts as any[],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [80, 80, 80] },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
    });

    doc.save(`Custos_Operacionais_Analitico_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // -----------------------------
  // ✅ Horas por Executor (agora não fica vazio)
  // -----------------------------
  const generateExecutorHoursReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleString('pt-BR');

    addHeader(doc, 'RELATÓRIO DE HORAS POR EXECUTOR', `Gerado em: ${today}`);

    const rows = getExecutorHoursRowsSmart();

    const rowsData = rows.map(r => [
      r.executorName,
      r.osNumber,
      r.startTime ? new Date(r.startTime).toLocaleString('pt-BR') : '-',
      r.endTime ? new Date(r.endTime).toLocaleString('pt-BR') : '-',
      Number(r.grossHours || 0).toFixed(2),
      Number(r.pausedHours || 0).toFixed(2),
      Number(r.netHours || 0).toFixed(2),
    ]);

    // se ainda estiver vazio, coloca uma linha explicativa (melhor que PDF em branco)
    if (!rowsData.length) {
      rowsData.push(['-', '-', '-', '-', '0.00', '0.00', '0.00']);
    }

    autoTable(doc, {
      startY: 30,
      head: [['Executor', 'OS', 'Início', 'Fim', 'Horas Brutas', 'Horas Pausadas', 'Horas Líquidas']],
      body: rowsData as any[],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`relatorio_horas_executor_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // -----------------------------
  // ✅ Custo por Empresa
  // -----------------------------
  const generateCompanyCostReport = () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    const today = new Date().toLocaleString('pt-BR');

    addHeader(doc, 'RELATÓRIO DE CUSTO POR EMPRESA', `Gerado em: ${today}`);

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    // Filtra OS por período usando openDate/startTime/limitDate/endTime como fallback
    const periodOS = oss.filter(o => {
      const d = new Date(o.openDate || o.startTime || o.limitDate || o.endTime || new Date().toISOString());
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    // ✅ Agora traz também o detalhamento do "NÃO INFORMADO"
    const { grouped, unknown } = groupCostsByCompanyWithBreakdown(periodOS, materials, services, equipments || [], projects);

    const rows = grouped.map(g => ([
      g.company,
      `R$ ${formatCurrency(g.material)}`,
      `R$ ${formatCurrency(g.service)}`,
      `R$ ${formatCurrency(g.total)}`
    ]));

    autoTable(doc, {
      startY: 30,
      head: [['Empresa', 'Materiais', 'Serviços', 'Total']],
      body: rows as any[],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });

    let y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 45;

    // ✅ Se existir gasto em "NÃO INFORMADO", detalha quais OS geraram esse custo
    if (unknown.length) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Detalhamento — Empresa: NÃO INFORMADO', 14, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total de OS sem empresa definida: ${unknown.length}`, 14, y);
      y += 6;

      const unkRows = unknown.slice(0, 250).map(u => ([
        u.osNumber,
        (u.description || '').substring(0, 45),
        (u.context || '').substring(0, 35),
        u.reason,
        `R$ ${formatCurrency(u.material)}`,
        `R$ ${formatCurrency(u.service)}`,
        `R$ ${formatCurrency(u.total)}`
      ]));

      autoTable(doc, {
        startY: y,
        head: [['OS', 'Descrição', 'Vínculo', 'Motivo', 'Materiais', 'Serviços', 'Total']],
        body: unkRows as any[],
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 44 },
          2: { cellWidth: 32 },
          3: { cellWidth: 35 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 18, fontStyle: 'bold' }
        }
      });
    }

    doc.save(`relatorio_custo_empresa_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // -----------------------------
  // ✅ Relatório por Executor com evidências (pausas + materiais manuais + imagens)
  // -----------------------------
  const generateExecutorReportWithEvidence = async () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    const today = new Date().toLocaleString('pt-BR');

    addHeader(doc, 'RELATÓRIO POR EXECUTOR (COM EVIDÊNCIAS)', `Gerado em: ${today}`);

    const filteredOS = applyFilters(oss);

    const executorKeys = (() => {
      if (selectedExecutor) {
        const { id, email } = normalizeExecutorKey(selectedExecutor);
        return Array.from(new Set([id, email].filter(Boolean)));
      }

      const set = new Set<string>();
      filteredOS.forEach((o: any) => {
        if (o.executorId) set.add(o.executorId);
        (o.executorIds || []).forEach((x: any) => x && set.add(x));
      });
      return Array.from(set);
    })();

    let y = 32;
    const maxOsPerExecutorWithImages = 30;

    for (const execKey of executorKeys) {
      const osForExec = filteredOS
        .filter(o => isOsForExecutor(o, execKey))
        .filter(o => (o as any).status === OSStatus.COMPLETED || !!(o as any).endTime);

      if (!osForExec.length) continue;

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Executor: ${getExecutorName(execKey)}`, 14, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Qtd OS concluídas no filtro: ${osForExec.length}`, 14, y);
      y += 6;

      const tableRows = osForExec.slice(0, maxOsPerExecutorWithImages).map(o => {
        const manualMats = getExecutorManualMaterials(o, execKey);
        const manualText = manualMats.length
          ? manualMats
              .map((m: any) => {
                const desc = m.description || m.desc || m.name || 'Material';
                const qty = m.quantity ?? m.qty ?? 0;
                const unit = m.unit ? ` ${m.unit}` : '';
                return `${desc} (${qty}${unit})`;
              })
              .join('; ')
          : '-';

        const pauses = getExecutorPauseText(o, execKey);

        return [
          (o as any).number || '-',
          String((o as any).description || '').substring(0, 50),
          (o as any).startTime
            ? new Date((o as any).startTime).toLocaleString('pt-BR')
            : ((o as any).openDate ? new Date((o as any).openDate).toLocaleString('pt-BR') : '-'),
          (o as any).endTime ? new Date((o as any).endTime).toLocaleString('pt-BR') : '-',
          pauses,
          manualText,
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['OS', 'Descrição', 'Início', 'Fim', 'Pausas (últimas)', 'Materiais manuais (executor)']],
        body: tableRows as any[],
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 45 },
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
          4: { cellWidth: 38 },
          5: { cellWidth: 38 },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Evidências (imagens de finalização):', 14, y);
      y += 6;

      const osWithEvidence = osForExec
        .map(o => ({ os: o, ev: getEvidence(o) }))
        .filter(x => !!x.ev)
        .slice(0, maxOsPerExecutorWithImages);

      if (!osWithEvidence.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('-', 14, y);
        y += 8;
      } else {
        for (const item of osWithEvidence) {
          const os: any = item.os as any;
          const ev = item.ev as string;

          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`OS ${os.number || '-'} - ${String(os.description || '').substring(0, 60)}`, 14, y);
          y += 4;

          const dataUrl = await loadImageAsDataUrl(ev);

          if (!dataUrl) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`(Não foi possível carregar a imagem. Ref: ${ev})`, 14, y);
            y += 8;
            continue;
          }

          const imgW = 80;
          const imgH = 45;
          try {
            doc.addImage(dataUrl, 'JPEG', 14, y, imgW, imgH);
            y += imgH + 8;
          } catch {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`(Erro ao inserir imagem no PDF. Ref: ${ev})`, 14, y);
            y += 8;
          }
        }
      }

      y += 6;
      doc.setDrawColor(220);
      doc.line(14, y, 196, y);
      y += 10;
    }

    doc.save(`relatorio_executor_evidencias_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // -----------------------------
  // UI
  // -----------------------------

  const generateAllOSReport = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleString('pt-BR');
    const filteredOS = applyFilters(oss).sort((a, b) => {
      const da = parseAnyDate((a as any).openDate || (a as any).startTime || (a as any).createdAt)?.getTime() || 0;
      const db = parseAnyDate((b as any).openDate || (b as any).startTime || (b as any).createdAt)?.getTime() || 0;
      return db - da;
    });

    addHeader(doc, 'RELATÓRIO GERAL DE ORDENS DE SERVIÇO', `Gerado em: ${today}`);

    const statusLabelMap: Record<string, string> = {
      [OSStatus.OPEN]: 'Aberta',
      [OSStatus.IN_PROGRESS]: 'Em andamento',
      [OSStatus.PAUSED]: 'Pausada',
      [OSStatus.COMPLETED]: 'Concluída',
      [OSStatus.CANCELED]: 'Cancelada',
    };

    const priorityLabelMap: Record<string, string> = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
    };

    const getProjectLabel = (projectId?: string) => {
      if (!projectId) return '-';
      const project = projects.find(p => p.id === projectId);
      return project ? `${project.code} - ${project.description}` : projectId;
    };

    const getBuildingLabel = (buildingId?: string) => {
      if (!buildingId) return '-';
      const building = buildings.find(b => b.id === buildingId);
      return building ? building.name : buildingId;
    };

    const getEquipmentLabel = (equipmentId?: string) => {
      if (!equipmentId) return '-';
      const equipment = equipments.find(e => e.id === equipmentId);
      return equipment ? `${equipment.code} - ${equipment.name}` : equipmentId;
    };

    const getExecutorNames = (os: OS) => {
      const anyOs: any = os as any;
      const keys = Array.from(new Set([anyOs.executorId, ...(anyOs.executorIds || [])].filter(Boolean)));
      if (!keys.length) return '-';
      return keys.map((key: string) => getExecutorName(key)).join(', ');
    };

    const getRequesterLabel = (os: OS) => {
      const anyOs: any = os as any;
      if (anyOs.requesterName) return anyOs.requesterName;
      if (anyOs.requesterId) {
        const requester = users.find(u => u.id === anyOs.requesterId || u.email === anyOs.requesterId);
        return requester?.name || anyOs.requesterId;
      }
      return '-';
    };

    const getSlaLabel = (os: OS) => {
      const limit = parseAnyDate((os as any).limitDate);
      if (!limit) return '-';
      const status = (os as any).status;
      const end = parseAnyDate((os as any).endTime);
      const delayed = status !== OSStatus.COMPLETED && status !== OSStatus.CANCELED && limit.getTime() < Date.now();
      const completedLate = status === OSStatus.COMPLETED && end && end.getTime() > limit.getTime();
      return `${limit.toLocaleDateString('pt-BR')} ${delayed || completedLate ? '(Atrasada)' : '(No prazo)'}`;
    };

    const materialLines = filteredOS.reduce((acc, os) => acc + ((os as any).materials || []).length, 0);
    const serviceLines = filteredOS.reduce((acc, os) => acc + ((os as any).services || []).length, 0);
    const totalMaterialsCost = filteredOS.reduce((acc, os) => acc + calculateOSCosts(os, materials, services).materialCost, 0);
    const totalServicesCost = filteredOS.reduce((acc, os) => acc + calculateOSCosts(os, materials, services).serviceCost, 0);
    const statusCount = filteredOS.reduce((acc: Record<string, number>, os) => {
      const key = String((os as any).status || 'SEM_STATUS');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    autoTable(doc, {
      startY: 30,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total de OS', String(filteredOS.length)],
        ['Abertas', String(statusCount[OSStatus.OPEN] || 0)],
        ['Em andamento', String(statusCount[OSStatus.IN_PROGRESS] || 0)],
        ['Pausadas', String(statusCount[OSStatus.PAUSED] || 0)],
        ['Concluídas', String(statusCount[OSStatus.COMPLETED] || 0)],
        ['Canceladas', String(statusCount[OSStatus.CANCELED] || 0)],
        ['Lançamentos de materiais', String(materialLines)],
        ['Lançamentos de serviços', String(serviceLines)],
        ['Custo total de materiais', `R$ ${formatCurrency(totalMaterialsCost)}`],
        ['Custo total de serviços', `R$ ${formatCurrency(totalServicesCost)}`],
        ['Custo geral', `R$ ${formatCurrency(totalMaterialsCost + totalServicesCost)}`],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    const summaryY = (doc as any).lastAutoTable.finalY + 8;

    const osRows = filteredOS.map((os: OS) => {
      const anyOs: any = os as any;
      const costs = calculateOSCosts(os, materials, services);
      const vinculo = anyOs.projectId
        ? `Projeto: ${getProjectLabel(anyOs.projectId)}`
        : anyOs.equipmentId
          ? `Equip.: ${getEquipmentLabel(anyOs.equipmentId)}`
          : anyOs.buildingId
            ? `Prédio: ${getBuildingLabel(anyOs.buildingId)}`
            : '-';

      return [
        anyOs.number || '-',
        String(anyOs.description || '-').slice(0, 60),
        statusLabelMap[String(anyOs.status)] || anyOs.status || '-',
        priorityLabelMap[String(anyOs.priority)] || anyOs.priority || '-',
        getRequesterLabel(os),
        getExecutorNames(os),
        vinculo,
        anyOs.openDate ? new Date(anyOs.openDate).toLocaleDateString('pt-BR') : '-',
        getSlaLabel(os),
        `R$ ${formatCurrency(costs.materialCost)}`,
        `R$ ${formatCurrency(costs.serviceCost)}`,
        `R$ ${formatCurrency(costs.totalCost)}`,
      ];
    });

    autoTable(doc, {
      startY: summaryY,
      head: [['OS', 'Descrição', 'Status', 'Prioridade', 'Solicitante', 'Executor(es)', 'Vínculo', 'Abertura', 'SLA', 'Materiais', 'Serviços', 'Total']],
      body: osRows.length ? osRows : [['-', 'Nenhuma OS encontrada para os filtros aplicados.', '-', '-', '-', '-', '-', '-', '-', 'R$ 0,00', 'R$ 0,00', 'R$ 0,00']],
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [50, 60, 70], textColor: 255 },
      columnStyles: {
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const raw = String(data.cell.raw || '');
          if (raw.includes('Concluída')) data.cell.styles.textColor = [5, 150, 105];
          if (raw.includes('Em andamento')) data.cell.styles.textColor = [37, 99, 235];
          if (raw.includes('Pausada')) data.cell.styles.textColor = [217, 119, 6];
          if (raw.includes('Cancelada')) data.cell.styles.textColor = [100, 116, 139];
        }
        if (data.section === 'body' && data.column.index === 8) {
          const raw = String(data.cell.raw || '');
          if (raw.includes('Atrasada')) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    let detailStartY = (doc as any).lastAutoTable.finalY + 10;

    for (const os of filteredOS) {
      const anyOs: any = os as any;
      const costs = calculateOSCosts(os, materials, services);
      const materialsRows = ((anyOs.materials || []) as any[]).map((item: any) => {
        const material = materials.find(m => m.id === item.materialId);
        return [
          material?.code || '-',
          material?.description || item.materialId || '-',
          Number(item.quantity || 0).toLocaleString('pt-BR'),
          item.fromLocation || '-',
          `R$ ${formatCurrency(Number(item.unitCost || 0))}`,
          `R$ ${formatCurrency(Number(item.quantity || 0) * Number(item.unitCost || 0))}`,
          item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : '-',
        ];
      });
      const serviceRows = ((anyOs.services || []) as any[]).map((item: any) => {
        const service = services.find(s => s.id === item.serviceTypeId);
        return [
          service?.name || item.serviceTypeId || '-',
          Number(item.quantity || 0).toLocaleString('pt-BR'),
          `R$ ${formatCurrency(Number(item.unitCost || 0))}`,
          `R$ ${formatCurrency(Number(item.quantity || 0) * Number(item.unitCost || 0))}`,
          item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : '-',
        ];
      });

      if (detailStartY > 150) {
        doc.addPage();
        detailStartY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`OS ${anyOs.number || '-'} - ${String(anyOs.description || '').slice(0, 80)}`, 14, detailStartY);
      detailStartY += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${statusLabelMap[String(anyOs.status)] || anyOs.status || '-'} | Prioridade: ${priorityLabelMap[String(anyOs.priority)] || anyOs.priority || '-'}`, 14, detailStartY);
      detailStartY += 5;
      doc.text(`Solicitante: ${getRequesterLabel(os)} | Executor(es): ${getExecutorNames(os)}`, 14, detailStartY);
      detailStartY += 5;
      doc.text(`Projeto: ${getProjectLabel(anyOs.projectId)} | Prédio: ${getBuildingLabel(anyOs.buildingId)} | Equipamento: ${getEquipmentLabel(anyOs.equipmentId)}`, 14, detailStartY);
      detailStartY += 5;
      doc.text(`Abertura: ${anyOs.openDate ? new Date(anyOs.openDate).toLocaleString('pt-BR') : '-'} | Início: ${anyOs.startTime ? new Date(anyOs.startTime).toLocaleString('pt-BR') : '-'} | Fim: ${anyOs.endTime ? new Date(anyOs.endTime).toLocaleString('pt-BR') : '-'}`, 14, detailStartY);
      detailStartY += 5;
      doc.text(`SLA: ${getSlaLabel(os)} | Tipo: ${anyOs.type || '-'} | Centro de custo: ${anyOs.costCenter || '-'}`, 14, detailStartY);
      detailStartY += 6;

      const execDescription = String(anyOs.executionDescription || '').trim();
      if (execDescription) {
        const descLines = doc.splitTextToSize(`Execução: ${execDescription}`, 265);
        doc.text(descLines, 14, detailStartY);
        detailStartY += descLines.length * 4 + 2;
      }

      autoTable(doc, {
        startY: detailStartY,
        head: [['Código', 'Material', 'Qtd', 'Origem', 'Unitário', 'Total', 'Data']],
        body: materialsRows.length ? materialsRows : [['-', 'Nenhum material lançado', '-', '-', 'R$ 0,00', 'R$ 0,00', '-']],
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      });

      detailStartY = (doc as any).lastAutoTable.finalY + 4;

      autoTable(doc, {
        startY: detailStartY,
        head: [['Serviço', 'Qtd/Horas', 'Unitário', 'Total', 'Data']],
        body: serviceRows.length ? serviceRows : [['Nenhum serviço lançado', '-', 'R$ 0,00', 'R$ 0,00', '-']],
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      });

      detailStartY = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Resumo da OS: Materiais R$ ${formatCurrency(costs.materialCost)} | Serviços R$ ${formatCurrency(costs.serviceCost)} | Total R$ ${formatCurrency(costs.totalCost)}`,
        14,
        detailStartY,
      );
      detailStartY += 10;
    }

    doc.save(`Relatorio_Geral_OS_${new Date().toISOString().slice(0, 10)}.pdf`);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Executor</label>
            <select
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
              value={selectedExecutor}
              onChange={e => setSelectedExecutor(e.target.value)}
            >
              <option value="">Todos</option>
              {users
                .filter(u => (u as any).role === 'EXECUTOR' || (u as any).role === 'PRESTADOR' || (u as any).isExecutor)
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
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
          <p className="text-slate-500 text-sm mb-6">Consumo total de itens do almoxarifado e custo médio.</p>
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
          <p className="text-slate-500 text-sm mb-6">Custo total por projeto incluindo materiais via OS, baixas diretas e serviços.</p>
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
          <p className="text-slate-500 text-sm mb-6">Entradas e saídas com responsável e contexto (OS/Proj).</p>
          <button
            onClick={generateStockFlowReport}
            className="mt-auto px-6 py-3 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 w-full justify-center"
          >
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* COST CENTERS REPORT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-coins"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Custos Operacionais (Analítico)</h3>
          <p className="text-slate-500 text-sm mb-6">Gastos por Edifício, Equipamento e ranking de OS.</p>
          <button
            onClick={generateCostCenterReport}
            className="mt-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center gap-2 w-full justify-center"
          >
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* EXECUTOR HOURS REPORT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-user-clock"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Horas por Executor</h3>
          <p className="text-slate-500 text-sm mb-6">Horas brutas, pausadas e líquidas por OS/executor.</p>
          <button
            onClick={generateExecutorHoursReport}
            className="mt-auto px-6 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors flex items-center gap-2 w-full justify-center"
          >
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* COMPANY COST REPORT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-building"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Custo por Empresa</h3>
          <p className="text-slate-500 text-sm mb-6">Total de materiais e serviços agrupados por empresa.</p>
          <button
            onClick={generateCompanyCostReport}
            className="mt-auto px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 w-full justify-center"
          >
            <i className="fas fa-file-pdf"></i> Gerar PDF
          </button>
        </div>

        {/* ALL OS REPORT */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group md:col-span-2">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Relatório Geral de OS</h3>
          <p className="text-slate-500 text-sm mb-6">Gera um PDF com todas as OS do filtro, resumo consolidado, custos e detalhamento de materiais e serviços por ordem.</p>
          <button
            onClick={() => { void generateAllOSReport(); }}
            className="mt-auto px-6 py-3 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 transition-colors flex items-center gap-2 w-full justify-center"
          >
            <i className="fas fa-file-pdf"></i> Gerar PDF de todas as OS
          </button>
        </div>

        {/* EXECUTOR REPORT WITH EVIDENCE */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group md:col-span-2">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-images"></i>
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Relatório por Executor (com evidências)</h3>
          <p className="text-slate-500 text-sm mb-6">
            Lista tarefas concluídas por executor + pausas + materiais manuais + imagens de evidência no PDF.
            {selectedExecutor ? ` (Filtrado em: ${getExecutorName(selectedExecutor)})` : ''}
          </p>
          <button
            onClick={() => { void generateExecutorReportWithEvidence(); }}
            className="mt-auto px-6 py-3 bg-emerald-700 text-white rounded-lg font-bold text-sm hover:bg-emerald-800 transition-colors flex items-center gap-2 w-full justify-center"
          >
            <i className="fas fa-file-pdf"></i> Gerar PDF com evidências
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;