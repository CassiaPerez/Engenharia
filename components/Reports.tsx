import React, { useMemo, useState } from 'react';
import { Material, Project, StockMovement, OS, ServiceType, User, Building, Equipment, OSStatus } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  calculateProjectCosts,
  calculateOSCosts,
  groupCostsByCompany,
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
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const applyFilters = (data: any[]) => {
    let filtered = [...data];

    if (dateFrom || dateTo) {
      filtered = filtered.filter((item: any) => {
        const itemDate = new Date(
          item.openDate || item.date || item.startDate || item.endTime || item.limitDate || item.createdAt
        );
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

  // ------------------------------------
  // Helpers para Executor Report (PDF)
  // ------------------------------------

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

    const legacy = os.executorId === id || os.executorId === email;
    const multi = (os.executorIds || []).includes(id) || (os.executorIds || []).includes(email);
    return legacy || multi;
  };

  const getExecutorPauseText = (os: OS, executorIdOrEmail: string) => {
    const anyOs: any = os as any;
    const { id, email } = normalizeExecutorKey(executorIdOrEmail);

    // novo modelo: executorStates[id/email].pauseHistory
    const states = anyOs.executorStates || {};
    const st = states[id] || states[email];
    const pauseHistory = (st?.pauseHistory || []) as any[];

    // legado: pauseHistory global
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
    /**
     * ⚠️ Ajuste se você já tem um campo exato.
     * Essa função tenta várias estruturas comuns.
     */
    const anyOs: any = os as any;
    const { id, email } = normalizeExecutorKey(executorIdOrEmail);

    // 1) os.executorManualMaterials[executorId] = [{ description, quantity, unit? }]
    const v1 = anyOs.executorManualMaterials?.[id] || anyOs.executorManualMaterials?.[email];
    if (Array.isArray(v1)) return v1;

    // 2) os.executorAddedMaterials[executorId] = [...]
    const v2 = anyOs.executorAddedMaterials?.[id] || anyOs.executorAddedMaterials?.[email];
    if (Array.isArray(v2)) return v2;

    // 3) os.manualMaterials = [{ description, quantity, unit?, executorId }]
    const v3 = anyOs.manualMaterials;
    if (Array.isArray(v3)) {
      const list = v3.filter((m: any) => m.executorId === id || m.executorId === email);
      if (list.length) return list;
    }

    // 4) fallback comum
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
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
    const isLandscape = (doc as any).internal?.pageSize?.getWidth?.() > (doc as any).internal?.pageSize?.getHeight?.();
    const w = isLandscape ? 297 : 210;

    doc.setFillColor(50, 60, 70);
    doc.rect(0, 0, w, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (subtitleRight) doc.text(subtitleRight, w - 14, 16, { align: 'right' });

    if (dateFrom || dateTo) {
      doc.setFontSize(8);
      doc.text(`Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`, w - 14, 20, { align: 'right' });
    }

    doc.setTextColor(0, 0, 0);
  };

  // ------------------------------------
  // Relatórios: Materiais / Projetos / Fluxo / Custos Operacionais (seus)
  // ------------------------------------

  const generateMaterialReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    const filteredMovements = applyFilters(movements);

    addHeader(doc, 'RELATÓRIO DE GASTOS POR MATERIAL', `Gerado em: ${today}`);

    const materialStats = materials
      .map(mat => {
        const outMovements = filteredMovements.filter(m => m.materialId === mat.id && m.type === 'OUT');
        const totalQtyOut = outMovements.reduce((acc, m) => acc + m.quantity, 0);
        const totalCostOut = totalQtyOut * mat.unitCost;
        return {
          code: mat.code,
          description: mat.description,
          unit: mat.unit,
          qtyOut: totalQtyOut,
          unitCost: mat.unitCost,
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
        return acc + (m.quantity * (mat?.unitCost || 0));
      }, 0);

      const totalReal = osCosts.totalReal + directMaterialCost;
      const totalMaterials = osCosts.totalMaterials + directMaterialCost;

      return {
        code: proj.code,
        desc: proj.description,
        status: proj.status,
        budget: proj.estimatedValue,
        osMaterial: totalMaterials,
        directMaterial: directMaterialCost,
        services: osCosts.totalServices,
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
    const to = dateTo ? new Date(dateTo) : null;

    const periodMovements = movements.filter(m => {
      const d = new Date(m.date);
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
        reference = `OS: ${osRef?.number || m.osId}`;
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

    // 1. CUSTOS POR EDIFÍCIO
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. CUSTOS POR EDIFÍCIO (FACILITIES)', 14, yPos);
    yPos += 5;

    const buildingCosts = buildings
      .map(b => {
        const relatedOS = oss.filter(o => o.buildingId === b.id && o.status !== 'CANCELED');
        const totalCost = relatedOS.reduce((acc, os) => acc + calculateOSCosts(os, materials, services).totalCost, 0);
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
      body: buildingCosts,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [50, 80, 120] },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 2. CUSTOS POR EQUIPAMENTO
    doc.text('2. CUSTOS POR EQUIPAMENTO (MANUTENÇÃO)', 14, yPos);
    yPos += 5;

    const equipmentCosts = equipments
      .map(eq => {
        const relatedOS = oss.filter(o => o.equipmentId === eq.id && o.status !== 'CANCELED');
        const totalCost = relatedOS.reduce((acc, os) => acc + calculateOSCosts(os, materials, services).totalCost, 0);
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
      .filter(o => o.status !== 'CANCELED')
      .map(o => {
        const costs = calculateOSCosts(o, materials, services);
        return { ...o, total: costs.totalCost };
      })
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 30)
      .map(o => [
        o.number,
        (o.description || '').substring(0, 40) + '...',
        o.type,
        `R$ ${formatCurrency((o as any).total)}`,
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

  // ------------------------------------
  // ✅ Relatório: Horas por Executor (tabela)
  // ------------------------------------
  const generateExecutorHoursReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleString('pt-BR');

    addHeader(doc, 'RELATÓRIO DE HORAS POR EXECUTOR', `Gerado em: ${today}`);

    const rowsData = buildExecutorHoursRows(oss, users || [], dateFrom, dateTo).map(r => [
      r.executorName,
      r.osNumber,
      r.startTime ? new Date(r.startTime).toLocaleString('pt-BR') : '-',
      r.endTime ? new Date(r.endTime).toLocaleString('pt-BR') : '-',
      Number(r.grossHours || 0).toFixed(2),
      Number(r.pausedHours || 0).toFixed(2),
      Number(r.netHours || 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Executor', 'OS', 'Início', 'Fim', 'Horas Brutas', 'Horas Pausadas', 'Horas Líquidas']],
      body: rowsData as any[],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`relatorio_horas_executor_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ------------------------------------
  // ✅ Relatório: Custo por Empresa (tabela)
  // ------------------------------------
  const generateCompanyCostReport = () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    const today = new Date().toLocaleString('pt-BR');

    addHeader(doc, 'RELATÓRIO DE CUSTO POR EMPRESA', `Gerado em: ${today}`);

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;

    const periodOS = oss.filter(o => {
      const d = new Date(o.openDate || o.startTime || o.limitDate || o.endTime || new Date().toISOString());
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    const grouped = groupCostsByCompany(periodOS, materials, services, equipments || [], projects);

    const rows = grouped.map(g => [
      g.company,
      `R$ ${formatCurrency(g.material)}`,
      `R$ ${formatCurrency(g.service)}`,
      `R$ ${formatCurrency(g.total)}`,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Empresa', 'Materiais', 'Serviços', 'Total']],
      body: rows as any[],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`relatorio_custo_empresa_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ------------------------------------
  // ✅ NOVO: Relatório por Executor (com evidências/imagens)
  // ------------------------------------
  const generateExecutorReportWithEvidence = async () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    const today = new Date().toLocaleString('pt-BR');

    addHeader(doc, 'RELATÓRIO POR EXECUTOR (COM EVIDÊNCIAS)', `Gerado em: ${today}`);

    // filtra OS por período/contexto
    const filteredOS = applyFilters(oss);

    // se selecionar executor, restringe a ele, senão agrupa todos
    const executorKeys = (() => {
      if (selectedExecutor) {
        const { id, email } = normalizeExecutorKey(selectedExecutor);
        return Array.from(new Set([id, email].filter(Boolean)));
      }

      // pega executores presentes em oss: executorId + executorIds
      const set = new Set<string>();
      filteredOS.forEach(o => {
        if (o.executorId) set.add(o.executorId);
        (o.executorIds || []).forEach(x => x && set.add(x));
      });
      return Array.from(set);
    })();

    let y = 32;

    const maxOsPerExecutorWithImages = 30;

    for (const execKey of executorKeys) {
      // pega os que pertencem ao executor e concluídas (para evidência e tarefas feitas)
      const osForExec = filteredOS
        .filter(o => isOsForExecutor(o, execKey))
        .filter(o => o.status === OSStatus.COMPLETED || (o as any).endTime); // garante "realizadas"

      if (!osForExec.length) continue;

      // quebra página se necessário
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

      // tabela resumo por executor
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
          o.number || '-',
          (o.description || '').substring(0, 50),
          o.startTime ? new Date(o.startTime).toLocaleString('pt-BR') : (o.openDate ? new Date(o.openDate).toLocaleString('pt-BR') : '-'),
          o.endTime ? new Date(o.endTime).toLocaleString('pt-BR') : '-',
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

      // seção de evidências (imagens)
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
          const os = item.os;
          const ev = item.ev as string;

          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`OS ${os.number || '-'} - ${(os.description || '').substring(0, 60)}`, 14, y);
          y += 4;

          // tenta carregar imagem como dataURL
          const dataUrl = await loadImageAsDataUrl(ev);

          if (!dataUrl) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`(Não foi possível carregar a imagem. Ref: ${ev})`, 14, y);
            y += 8;
            continue;
          }

          // desenha miniatura
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

      // separador entre executores
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

        {/* ✅ EXECUTOR REPORT WITH EVIDENCE */}
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