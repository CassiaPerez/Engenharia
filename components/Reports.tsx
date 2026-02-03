
import React from 'react';
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
  users?: User[]; // Opcional para manter compatibilidade, mas necessário para relatórios novos
  buildings?: Building[];
  equipments?: Equipment[];
}

const Reports: React.FC<Props> = ({ materials, projects, movements, oss, services, users = [], buildings = [], equipments = [] }) => {

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const generateMaterialReport = () => {
      const doc = new jsPDF();
      const today = new Date().toLocaleDateString('pt-BR');

      doc.setFillColor(71, 122, 127);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE GASTOS POR MATERIAL", 14, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${today}`, 196, 16, { align: 'right' });

      // Agrupar movimentações de SAÍDA (OUT) por Material
      const materialStats = materials.map(mat => {
          const outMovements = movements.filter(m => m.materialId === mat.id && m.type === 'OUT');
          const totalQtyOut = outMovements.reduce((acc, m) => acc + m.quantity, 0);
          const totalCostOut = totalQtyOut * mat.unitCost;
          return {
              code: mat.code,
              description: mat.description,
              unit: mat.unit,
              qtyOut: totalQtyOut,
              unitCost: mat.unitCost,
              totalCost: totalCostOut
          };
      }).filter(i => i.qtyOut > 0).sort((a,b) => b.totalCost - a.totalCost); // Apenas com movimento, ordenado por valor

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
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
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
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE CUSTOS POR PROJETO (OS + BAIXA DIRETA)", 14, 16);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

      const projectStats = projects.map(proj => {
          // 1. Custos via OS (Engine já calcula isso)
          const osCosts = calculateProjectCosts(proj, oss, materials, services);
          
          // 2. Custos via Baixa Direta (Inventory Direct Issue)
          // Procura movimentações do tipo OUT que tenham projectId igual ao projeto atual
          const directMovements = movements.filter(m => m.projectId === proj.id && m.type === 'OUT');
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
              osMaterial: osCosts.totalMaterials,
              directMaterial: directMaterialCost,
              services: osCosts.totalServices,
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
          columnStyles: { 3: {halign:'right'}, 4: {halign:'right'}, 5: {halign:'right', fontStyle:'bold', textColor:[100,100,100]}, 6: {halign:'right'}, 7: {halign:'right', fontStyle:'bold'} },
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
      doc.setFont("helvetica", "bold");
      doc.text("FLUXO DE ESTOQUE DETALHADO (ENTRADA / SAÍDA)", 14, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${today}`, 280, 16, { align: 'right' });

      // Filtrar e ordenar movimentações
      const sortedMovements = [...movements].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const rows = sortedMovements.map(m => {
          const mat = materials.find(mt => mt.id === m.materialId);
          // Tenta encontrar o usuário pelo ID ou retorna o próprio ID/System
          const user = users.find(u => u.id === m.userId)?.name || 'Sistema / Importação';
          
          let reference = '-';
          if (m.osId) reference = `OS: ${m.osId}`;
          else if (m.projectId) {
              const p = projects.find(proj => proj.id === m.projectId);
              reference = `Proj: ${p?.code || 'N/A'}`;
          }

          return [
              new Date(m.date).toLocaleString(),
              m.type,
              mat?.code || '???',
              mat?.description || 'Item excluído',
              m.quantity,
              m.type === 'OUT' || m.type === 'PROJECT_OUT' ? user : '-', // Responsável pela retirada/reserva
              reference,
              m.description
          ];
      });

      autoTable(doc, {
          startY: 30,
          head: [['Data', 'Tipo', 'Código', 'Material', 'Qtd', 'Responsável Reserva', 'Ref. (OS/Proj)', 'Detalhes']],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [50, 60, 70], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 
              1: { fontStyle: 'bold' },
              4: { halign: 'right', fontStyle: 'bold' }, 
              5: { fontStyle: 'bold', textColor: [20, 100, 200] } // Destacar responsável
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

      // Cabeçalho
      doc.setFillColor(71, 122, 127);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE CUSTOS OPERACIONAIS (OS & ATIVOS)", 14, 16);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${today}`, 196, 16, { align: 'right' });

      let yPos = 35;

      // 1. CUSTOS POR EDIFÍCIO
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("1. CUSTOS POR EDIFÍCIO (FACILITIES)", 14, yPos);
      yPos += 5;

      const buildingCosts = buildings.map(b => {
          const relatedOS = oss.filter(o => o.buildingId === b.id && o.status !== 'CANCELED');
          const totalCost = relatedOS.reduce((acc, os) => acc + calculateOSCosts(os, materials, services).totalCost, 0);
          return [b.name, b.city, relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
      }).sort((a,b) => {
          const valA = parseFloat(String(a[3]).replace('R$ ','').replace('.','').replace(',','.'));
          const valB = parseFloat(String(b[3]).replace('R$ ','').replace('.','').replace(',','.'));
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

      // 2. CUSTOS POR EQUIPAMENTO
      doc.text("2. CUSTOS POR EQUIPAMENTO (MANUTENÇÃO)", 14, yPos);
      yPos += 5;

      const equipmentCosts = equipments.map(eq => {
          const relatedOS = oss.filter(o => o.equipmentId === eq.id && o.status !== 'CANCELED');
          const totalCost = relatedOS.reduce((acc, os) => acc + calculateOSCosts(os, materials, services).totalCost, 0);
          return [eq.code, eq.name, eq.status, relatedOS.length, `R$ ${formatCurrency(totalCost)}`];
      }).sort((a,b) => {
          const valA = parseFloat(String(a[4]).replace('R$ ','').replace('.','').replace(',','.'));
          const valB = parseFloat(String(b[4]).replace('R$ ','').replace('.','').replace(',','.'));
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

      // 3. CUSTOS POR OS (TOP 30)
      // Se necessário, nova página
      if (yPos > 240) {
          doc.addPage();
          yPos = 20;
      }

      doc.text("3. TOP 30 ORDENS DE SERVIÇO MAIS CARAS", 14, yPos);
      yPos += 5;

      const osCosts = oss
          .filter(o => o.status !== 'CANCELED')
          .map(o => {
              const costs = calculateOSCosts(o, materials, services);
              return { ...o, total: costs.totalCost };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 30)
          .map(o => [
              o.number,
              o.description.substring(0, 40) + '...',
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Central de Relatórios</h2>
        <p className="text-slate-500 text-base mt-1">Exportação de dados para análise gerencial.</p>
      </header>

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

          {/* STOCK FLOW REPORT (NEW) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  <i className="fas fa-exchange-alt"></i>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Fluxo de Estoque Detalhado</h3>
              <p className="text-slate-500 text-sm mb-6">Entradas e saídas com identificação do <strong>responsável pela reserva</strong> e contexto (OS/Proj).</p>
              <button onClick={generateStockFlowReport} className="mt-auto px-6 py-3 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 w-full justify-center">
                  <i className="fas fa-file-pdf"></i> Gerar PDF
              </button>
          </div>

          {/* COST CENTERS REPORT (NEW) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col items-start group">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  <i className="fas fa-coins"></i>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Custos Operacionais (Analítico)</h3>
              <p className="text-slate-500 text-sm mb-6">Gastos segmentados por <strong>Edifício</strong>, <strong>Equipamento</strong> e Ranking de <strong>OS</strong>.</p>
              <button onClick={generateCostCenterReport} className="mt-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center gap-2 w-full justify-center">
                  <i className="fas fa-file-pdf"></i> Gerar PDF
              </button>
          </div>
      </div>
    </div>
  );
};

export default Reports;
