
import React, { useMemo, useState } from 'react';
import { Project, OS, Material, ServiceType, OSStatus, ProjectStatus } from '../types';
import { calculateProjectCosts, formatDate } from '../services/engine';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  projects: Project[];
  oss: OS[];
  materials: Material[];
  services: ServiceType[];
}

const Dashboard: React.FC<Props> = ({ projects, oss, materials, services }) => {
  const [showDetail, setShowDetail] = useState<Project | null>(null);

  const stats = useMemo(() => {
    const totalEstimated = projects.reduce((acc, p) => acc + p.estimatedValue, 0);
    
    // Calcula totais
    let totalSpent = 0;
    projects.forEach(p => {
      totalSpent += calculateProjectCosts(p, oss, materials, services).totalReal;
    });

    const delayedOS = oss.filter(o => o.status !== OSStatus.COMPLETED && new Date(o.limitDate) < new Date()).length;
    
    return { totalEstimated, totalSpent, delayedOS };
  }, [projects, oss, materials, services]);

  // Ordenação dos projetos por data de início
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [projects]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.FINISHED: return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-sm font-bold uppercase border border-emerald-200">Concluído</span>;
      case ProjectStatus.IN_PROGRESS: return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm font-bold uppercase border border-blue-200">Em Andamento</span>;
      case ProjectStatus.PAUSED: return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md text-sm font-bold uppercase border border-amber-200">Pausado</span>;
      case ProjectStatus.CANCELED: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-bold uppercase border border-slate-200">Cancelado</span>;
      default: return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-bold uppercase border border-slate-200">Planejado</span>;
    }
  };

  const getActualMaterialQty = (projectId: string, materialId: string) => oss.filter(o => o.projectId === projectId && o.status !== OSStatus.CANCELED).reduce((acc, o) => acc + (o.materials.find(m => m.materialId === materialId)?.quantity || 0), 0);
  const getActualServiceHours = (projectId: string, serviceId: string) => oss.filter(o => o.projectId === projectId && o.status !== OSStatus.CANCELED).reduce((acc, o) => acc + (o.services.find(s => s.serviceTypeId === serviceId)?.quantity || 0), 0);

  // --- PDF GENERATION: Relatório Consolidado ---
  const generateConsolidatedReport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('pt-BR');

    // Header Branding
    doc.setFillColor(71, 122, 127); // Clean Primary
    doc.rect(0, 0, 297, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE CUSTOS POR PROJETO (CAPEX)", 14, 16);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

    let totalBudget = 0;
    let totalReal = 0;

    const tableBody = sortedProjects.map(p => {
        const costs = calculateProjectCosts(p, oss, materials, services);
        totalBudget += p.estimatedValue;
        totalReal += costs.totalReal;
        
        const variance = p.estimatedValue - costs.totalReal;
        const variancePct = p.estimatedValue > 0 ? (costs.totalReal / p.estimatedValue) * 100 : 0;

        return [
            p.code,
            p.description,
            p.responsible,
            formatDate(p.startDate),
            p.status,
            `R$ ${formatCurrency(p.estimatedValue)}`,
            `R$ ${formatCurrency(costs.totalReal)}`,
            `R$ ${formatCurrency(variance)}`,
            `${variancePct.toFixed(1)}%`
        ];
    });

    // Add Summary Row
    tableBody.push([
        '', 
        'TOTAIS CONSOLIDADOS', 
        '', 
        '', 
        '', 
        `R$ ${formatCurrency(totalBudget)}`, 
        `R$ ${formatCurrency(totalReal)}`, 
        `R$ ${formatCurrency(totalBudget - totalReal)}`, 
        `${totalBudget > 0 ? ((totalReal/totalBudget)*100).toFixed(1) : 0}%`
    ]);

    autoTable(doc, {
        head: [['Código', 'Projeto', 'Responsável', 'Início', 'Status', 'Budget (Plan)', 'Custo Real', 'Saldo (Var)', '% Uso']],
        body: tableBody,
        startY: 35,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [71, 122, 127], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold' },
            5: { halign: 'right' }, // Budget
            6: { halign: 'right', fontStyle: 'bold' }, // Real
            7: { halign: 'right' }, // Var
            8: { halign: 'right' }  // %
        },
        didParseCell: function(data) {
            // Highlight Summary Row
            if (data.row.index === tableBody.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [240, 240, 240];
            }
        }
    });

    doc.save(`Relatorio_Custos_Projetos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateProjectDetailPDF = (project: Project) => {
    const doc = new jsPDF();
    const costs = calculateProjectCosts(project, oss, materials, services);

    // Header
    doc.setFillColor(71, 122, 127); // Brand Primary Color
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("FICHA TÉCNICA DE PROJETO (CAPEX)", 14, 13);
    
    // Project Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    let yPos = 30;
    doc.text(`Código: ${project.code}`, 14, yPos);
    doc.text(`Status: ${project.status}`, 120, yPos);
    
    yPos += 6;
    doc.text(`Descrição:`, 14, yPos);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(project.description, 170);
    doc.text(descLines, 35, yPos);
    yPos += descLines.length * 5;

    if (project.detailedDescription) {
        doc.setFont("helvetica", "bold");
        doc.text(`Detalhes:`, 14, yPos);
        doc.setFont("helvetica", "normal");
        const detLines = doc.splitTextToSize(project.detailedDescription, 170);
        doc.text(detLines, 35, yPos);
        yPos += detLines.length * 5 + 2;
    }

    doc.setFont("helvetica", "bold");
    doc.text(`Local: ${project.location || '-'} | Cidade: ${project.city || '-'}`, 14, yPos);
    yPos += 6;
    doc.text(`Responsável: ${project.responsible || '-'} | Centro de Custo: ${project.costCenter || '-'}`, 14, yPos);
    yPos += 6;
    doc.text(`Datas: Início ${formatDate(project.startDate)} | Fim Est. ${formatDate(project.estimatedEndDate)}`, 14, yPos);
    
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;

    // Financial Summary
    doc.setFontSize(11);
    doc.setTextColor(71, 122, 127);
    doc.text("RESUMO FINANCEIRO", 14, yPos);
    yPos += 8;
    
    const summaryData = [
        ["Orçamento Aprovado (Budget)", `R$ ${formatCurrency(project.estimatedValue)}`],
        ["Custo Realizado (Total)", `R$ ${formatCurrency(costs.totalReal)}`],
        ["Variação", `R$ ${formatCurrency(costs.variance)} (${costs.variancePercent.toFixed(1)}% utilizado)`]
    ];
    
    autoTable(doc, {
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Materials Table
    doc.text("PLANEJAMENTO DE MATERIAIS (FÍSICO)", 14, yPos);
    yPos += 5;
    
    const materialRows = project.plannedMaterials.map(pm => {
        const actual = getActualMaterialQty(project.id, pm.materialId);
        const mat = materials.find(m => m.id === pm.materialId);
        const diff = actual - pm.quantity;
        return [
            mat?.code || '-',
            mat?.description || 'Item excluído',
            pm.quantity.toString(),
            actual.toString(),
            diff > 0 ? `+${diff}` : diff.toString()
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Cód', 'Material', 'Plan', 'Real', 'Var']],
        body: materialRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 122, 127] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Services Table
    doc.text("PLANEJAMENTO DE SERVIÇOS (HH)", 14, yPos);
    yPos += 5;

    const serviceRows = project.plannedServices.map(ps => {
        const actual = getActualServiceHours(project.id, ps.serviceTypeId);
        const srv = services.find(s => s.id === ps.serviceTypeId);
        const diff = actual - ps.hours;
        return [
            srv?.name || 'Serviço excluído',
            ps.hours.toString(),
            actual.toString(),
            diff > 0 ? `+${diff}` : diff.toString()
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Serviço', 'Plan (h)', 'Real (h)', 'Var']],
        body: serviceRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 122, 127] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'center' } }
    });

    doc.save(`${project.code}_Detalhado.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Painel de Governança</h2>
          <p className="text-slate-600 text-lg mt-1 font-medium">Visão consolidada de custos e performance industrial.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={generateConsolidatedReport}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2"
            >
                <i className="fas fa-file-invoice-dollar"></i> Relatório de Gastos
            </button>
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Operante
            </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Capex Planejado" value={`R$ ${formatCurrency(stats.totalEstimated)}`} icon="fa-sack-dollar" color="blue" sub="Orçamento Global" />
        <KpiCard title="Total Executado" value={`R$ ${formatCurrency(stats.totalSpent)}`} icon="fa-chart-line" color="emerald" sub="Realizado Acumulado" />
        <KpiCard title="OS Críticas" value={stats.delayedOS.toString()} icon="fa-triangle-exclamation" color={stats.delayedOS > 0 ? "red" : "slate"} sub="Fora do SLA" />
        <KpiCard title="Projetos Ativos" value={projects.length.toString()} icon="fa-network-wired" color="purple" sub="Em Andamento" />
      </div>

      {/* Tabela de Detalhamento de Projetos */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <i className="fas fa-table-list text-clean-primary"></i> Detalhamento de Custos por Projeto
          </h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Acompanhamento físico-financeiro detalhado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base text-left">
            <thead className="bg-white text-slate-500 font-bold uppercase text-xs border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-6 py-5">Código</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5 text-center">Início</th>
                <th className="px-6 py-5 text-right">Orçamento (Plan)</th>
                <th className="px-6 py-5 text-right">Custo Real</th>
                <th className="px-6 py-5 text-right">Variação (R$)</th>
                <th className="px-6 py-5 text-right">Var (%)</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedProjects.map(p => {
                const costs = calculateProjectCosts(p, oss, materials, services);
                const variance = costs.variance; // budget - real
                const variancePercent = costs.variancePercent; // (real / budget) * 100
                const isPositive = variance >= 0; // Se variance >= 0, está dentro do budget (economia)
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 font-mono font-bold text-slate-700">{p.code}</td>
                    <td className="px-6 py-5 font-bold text-slate-800">{p.description}</td>
                    <td className="px-6 py-5 text-center text-slate-500 font-medium">{formatDate(p.startDate)}</td>
                    <td className="px-6 py-5 text-right text-slate-600 font-medium">R$ {formatCurrency(p.estimatedValue)}</td>
                    <td className="px-6 py-5 text-right font-bold text-slate-900">R$ {formatCurrency(costs.totalReal)}</td>
                    <td className={`px-6 py-5 text-right font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''} R$ {formatCurrency(variance)}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <span className={`px-2.5 py-1 rounded-md text-sm font-bold border ${variancePercent > 100 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                         {variancePercent.toFixed(1)}%
                       </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                        {getStatusBadge(p.status)}
                    </td>
                    <td className="px-6 py-5 text-center">
                       <button 
                         onClick={() => setShowDetail(p)}
                         className="text-slate-400 hover:text-clean-primary transition-colors text-base font-bold flex items-center justify-center gap-1 mx-auto"
                       >
                          Ver <i className="fas fa-chevron-right text-xs"></i>
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in duration-200">
             <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div>
                   <h3 className="text-xl font-bold text-slate-900">Detalhamento Físico-Financeiro</h3>
                   <p className="text-base text-slate-600 mt-1 font-medium">{showDetail.code} - {showDetail.description}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => generateProjectDetailPDF(showDetail)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-sm transition-all border border-slate-200 flex items-center gap-2">
                        <i className="fas fa-print"></i> Imprimir PDF
                    </button>
                    <button onClick={() => setShowDetail(null)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times text-xl"></i></button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Tabelas de comparativo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-900 uppercase mb-5 border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-cubes text-slate-500"></i> Materiais (Plan x Real)</h4>
                        <table className="w-full text-base">
                            <thead>
                                <tr className="text-slate-500 font-bold uppercase text-xs"><th className="text-left pb-3">Item</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {showDetail.plannedMaterials.map(pm => {
                                    const actual = getActualMaterialQty(showDetail.id, pm.materialId);
                                    const mat = materials.find(m => m.id === pm.materialId);
                                    const diff = actual - pm.quantity;
                                    return (
                                        <tr key={pm.materialId}>
                                            <td className="py-3 text-slate-800 font-bold">{mat?.description}</td>
                                            <td className="text-right text-slate-600 font-medium">{pm.quantity}</td>
                                            <td className="text-right text-slate-900 font-bold">{actual}</td>
                                            <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${diff > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>{diff > 0 ? `+${diff}` : diff}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-900 uppercase mb-5 border-b border-slate-200 pb-3 flex items-center gap-2"><i className="fas fa-clock text-slate-500"></i> Serviços (Horas)</h4>
                        <table className="w-full text-base">
                            <thead>
                                <tr className="text-slate-500 font-bold uppercase text-xs"><th className="text-left pb-3">Tipo</th><th className="text-right pb-3">Plan</th><th className="text-right pb-3">Real</th><th className="text-center pb-3">Var</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {showDetail.plannedServices.map(ps => {
                                    const actual = getActualServiceHours(showDetail.id, ps.serviceTypeId);
                                    const srv = services.find(s => s.id === ps.serviceTypeId);
                                    const diff = actual - ps.hours;
                                    return (
                                        <tr key={ps.serviceTypeId}>
                                            <td className="py-3 text-slate-800 font-bold">{srv?.name}</td>
                                            <td className="text-right text-slate-600 font-medium">{ps.hours}</td>
                                            <td className="text-right text-slate-900 font-bold">{actual}</td>
                                            <td className="text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${diff > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>{diff > 0 ? `+${diff}` : diff}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KpiCard = ({ title, value, icon, color, sub }: any) => {
  const styles: any = {
    blue: { icon: 'text-blue-600 bg-blue-50', border: 'border-l-[6px] border-l-blue-500' },
    emerald: { icon: 'text-emerald-600 bg-emerald-50', border: 'border-l-[6px] border-l-emerald-500' },
    red: { icon: 'text-rose-600 bg-rose-50', border: 'border-l-[6px] border-l-rose-500' },
    purple: { icon: 'text-purple-600 bg-purple-50', border: 'border-l-[6px] border-l-purple-500' },
    slate: { icon: 'text-slate-600 bg-slate-100', border: 'border-l-[6px] border-l-slate-400' }
  };
  
  const activeStyle = styles[color] || styles.slate;

  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all ${activeStyle.border}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{sub}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeStyle.icon}`}>
          <i className={`fas ${icon} text-xl`}></i>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
