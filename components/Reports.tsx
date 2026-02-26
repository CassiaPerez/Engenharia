import React, { useMemo, useState } from "react";
import { engine } from "../services/engine";
import {
  calcEffectiveHoursForOS,
  COMPANY_OPTIONS,
  formatDateBR,
  formatDateTimeBR,
  inferCompanyFrom,
  inPeriod,
  MaterialWithdrawal,
  OS,
  ReportPeriod,
} from "../types";

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoMonthStart() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function printWindow(html: string, title = "Relatório") {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { font-size: 18px; margin: 0 0 6px 0; }
          .meta { color: #475569; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
          th { background: #f8fafc; text-align: left; }
          .badge { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
          .b-ok { background:#dcfce7; color:#166534; }
          .b-warn { background:#fef3c7; color:#92400e; }
          .b-bad { background:#fee2e2; color:#991b1b; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
}

export default function Reports() {
  const [db, setDb] = useState(() => engine.load());
  const reload = () => setDb(engine.load());

  const [period, setPeriod] = useState<ReportPeriod>({
    from: isoMonthStart(),
    to: isoToday(),
  });

  const osById = useMemo(() => {
    const map = new Map<string, OS>();
    for (const o of db.os || []) map.set(o.id, o);
    return map;
  }, [db.os]);

  const projectById = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of db.projects || []) map.set(p.id, p);
    return map;
  }, [db.projects]);

  const equipmentById = useMemo(() => {
    const map = new Map<string, any>();
    for (const e of db.equipments || []) map.set(e.id, e);
    return map;
  }, [db.equipments]);

  // 1) Retiradas / baixas
  const withdrawalsInPeriod = useMemo(() => {
    return (db.withdrawals || []).filter(w => inPeriod(w.date || w.createdAt, period));
  }, [db.withdrawals, period]);

  function emitWithdrawalsReport() {
    const rows = withdrawalsInPeriod;

    const html = `
      <h1>Relatório de Retiradas (Baixa de Almoxarifado)</h1>
      <div class="meta">
        Período: <b>${formatDateBR(period.from)}</b> até <b>${formatDateBR(period.to)}</b><br/>
        Total de registros: <b>${rows.length}</b>
      </div>

      <table>
        <thead>
          <tr>
            <th>Data da retirada</th>
            <th>Quem deu baixa</th>
            <th>OS / Projeto</th>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Local</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(r => {
              const osRef = r.osCode ? `OS ${r.osCode}` : r.osId ? `OS ${r.osId}` : "-";
              const projRef = r.projectName || r.projectId || "-";
              const ref = r.osId || r.osCode ? `${osRef}<br/><span style="color:#64748b">${projRef}</span>` : projRef;

              return `
                <tr>
                  <td>${formatDateTimeBR(r.date || r.createdAt)}</td>
                  <td>${r.userName || r.userId}</td>
                  <td>${ref}</td>
                  <td>${r.productDescription || "-"}</td>
                  <td>${r.qty} ${r.unit || ""}</td>
                  <td>${r.location || "-"}</td>
                  <td>${r.observation || "-"}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    printWindow(html, "Retiradas - Almoxarifado");
  }

  // 2) Horas por executor
  const hoursByExecutor = useMemo(() => {
    const map = new Map<string, { name: string; hours: number }>();

    for (const os of db.os || []) {
      const osHours = calcEffectiveHoursForOS(os);
      const executors = os.executors || [];
      if (!executors.length) continue;

      // Se existir executions detalhadas, usa somatório por executor
      const execs = os.executions || [];
      if (execs.length) {
        for (const ex of execs) {
          // calcula horas por execução isoladamente
          const tmpOS: OS = { ...os, executions: [ex] };
          const h = calcEffectiveHoursForOS(tmpOS);
          const key = ex.executorId;
          const prev = map.get(key) || { name: ex.executorName || key, hours: 0 };
          map.set(key, { ...prev, hours: prev.hours + h });
        }
      } else {
        // fallback: divide igualmente
        const each = osHours / executors.length;
        for (const ex of executors) {
          const prev = map.get(ex.id) || { name: ex.name || ex.id, hours: 0 };
          map.set(ex.id, { ...prev, hours: prev.hours + each });
        }
      }
    }

    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [db.os]);

  function emitHoursReport() {
    const rows = hoursByExecutor.sort((a, b) => b.hours - a.hours);

    const html = `
      <h1>Relatório de Horas por Executor</h1>
      <div class="meta">
        Período de referência: <b>Baseado nas execuções registradas no sistema</b><br/>
        Total de executores: <b>${rows.length}</b>
      </div>

      <table>
        <thead>
          <tr>
            <th>Executor</th>
            <th>Horas</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(r => {
              const h = r.hours || 0;
              return `
                <tr>
                  <td>${r.name}</td>
                  <td>${h.toFixed(2)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    printWindow(html, "Horas por Executor");
  }

  // 3) Custo por empresa
  const costByCompany = useMemo(() => {
    const map = new Map<string, number>();

    // custo via withdrawals (baixas)
    for (const w of db.withdrawals || []) {
      if (!inPeriod(w.date || w.createdAt, period)) continue;

      // localizar os/projeto/equipamento para inferir empresa com prioridade
      const os = w.osId ? osById.get(w.osId) : undefined;
      const p = os?.projectId ? projectById.get(os.projectId) : w.projectId ? projectById.get(w.projectId) : undefined;
      const eq = os?.equipmentId ? equipmentById.get(os.equipmentId) : undefined;

      const company = (w.company && w.company !== "Não informado") ? w.company : inferCompanyFrom(eq, p);
      const cost = Number((w as any).unitCost || 0) * Number(w.qty || 0); // se existir unitCost no seu sistema
      const prev = map.get(company) || 0;
      map.set(company, prev + (Number.isFinite(cost) ? cost : 0));
    }

    // garantir presença de todas as empresas
    for (const c of COMPANY_OPTIONS) {
      if (!map.has(c)) map.set(c, 0);
    }

    return Array.from(map.entries()).map(([company, cost]) => ({ company, cost }));
  }, [db.withdrawals, period, osById, projectById, equipmentById]);

  function emitCostByCompanyReport() {
    const rows = costByCompany.sort((a, b) => b.cost - a.cost);

    const html = `
      <h1>Relatório de Custo por Empresa</h1>
      <div class="meta">
        Período: <b>${formatDateBR(period.from)}</b> até <b>${formatDateBR(period.to)}</b><br/>
        Observação: custo calculado a partir das retiradas (qty * unitCost quando disponível).
      </div>

      <table>
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Custo (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(r => {
              return `
                <tr>
                  <td>${r.company}</td>
                  <td>${r.cost.toFixed(2)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    printWindow(html, "Custo por Empresa");
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-bold text-slate-900">Relatórios</div>
          <div className="text-sm text-slate-600">Emita relatórios em PDF/print com filtros por período.</div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600">De</label>
            <input
              type="date"
              value={period.from}
              onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">Até</label>
            <input
              type="date"
              value={period.to}
              onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <button
            className="h-[42px] rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={reload}
          >
            Atualizar dados
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900">Retiradas (Baixa)</div>
          <div className="mt-1 text-xs text-slate-600">
            Contém período, quem deu baixa, OS/Projeto e data da retirada.
          </div>
          <button
            className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={emitWithdrawalsReport}
          >
            Emitir relatório
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900">Horas por Executor</div>
          <div className="mt-1 text-xs text-slate-600">Consolida horas efetivas descontando pausas.</div>
          <button
            className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={emitHoursReport}
          >
            Emitir relatório
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900">Custo por Empresa</div>
          <div className="mt-1 text-xs text-slate-600">Agrupa custo por empresa (Cropbio, etc.).</div>
          <button
            className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={emitCostByCompanyReport}
          >
            Emitir relatório
          </button>
        </div>
      </div>
    </div>
  );
}