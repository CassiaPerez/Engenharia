import React, { useMemo, useState } from "react";
import { engine } from "../services/engine";
import { inferCompanyFrom, OS } from "../types";

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Dashboard() {
  const [db, setDb] = useState(() => engine.load());

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

  // MODELO 1: custo por empresa baseado em projeto.location / equipamento.company (quando existir)
  const modelCostByCompany = useMemo(() => {
    const map = new Map<string, number>();

    for (const w of db.withdrawals || []) {
      const os = w.osId ? db.os.find(o => o.id === w.osId) : undefined;
      const p = os?.projectId ? projectById.get(os.projectId) : w.projectId ? projectById.get(w.projectId) : undefined;
      const eq = os?.equipmentId ? equipmentById.get(os.equipmentId) : undefined;

      const company = (w as any).company && (w as any).company !== "Não informado" ? (w as any).company : inferCompanyFrom(eq, p);
      const cost = Number((w as any).unitCost || 0) * Number(w.qty || 0);

      map.set(company, (map.get(company) || 0) + (Number.isFinite(cost) ? cost : 0));
    }

    return Array.from(map.entries())
      .map(([company, cost]) => ({ company, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [db.withdrawals, db.os, projectById, equipmentById]);

  // MODELO 2: custo por centro de custo (project.costCenter)
  const modelCostByCostCenter = useMemo(() => {
    const map = new Map<string, number>();

    for (const w of db.withdrawals || []) {
      const os = w.osId ? db.os.find(o => o.id === w.osId) : undefined;
      const p = os?.projectId ? projectById.get(os.projectId) : w.projectId ? projectById.get(w.projectId) : undefined;

      const cc = p?.costCenter || "Sem centro de custo";
      const cost = Number((w as any).unitCost || 0) * Number(w.qty || 0);

      map.set(cc, (map.get(cc) || 0) + (Number.isFinite(cost) ? cost : 0));
    }

    return Array.from(map.entries())
      .map(([costCenter, cost]) => ({ costCenter, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [db.withdrawals, db.os, projectById]);

  const stats = useMemo(() => {
    const os = db.os || [];
    const open = os.filter(o => o.status !== "Finalizada" && o.status !== "Cancelada").length;
    const paused = os.filter(o => o.status === "Pausada").length;
    const done = os.filter(o => o.status === "Finalizada").length;

    return { open, paused, done };
  }, [db.os]);

  return (
    <div className="p-4">
      <div className="mb-3">
        <div className="text-xl font-bold text-slate-900">Dashboard</div>
        <div className="text-sm text-slate-600">Visão geral (modelo) de custos e status.</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">OS em andamento</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{stats.open}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">OS pausadas</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{stats.paused}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-600">OS finalizadas</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{stats.done}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900">Custo por Empresa (modelo)</div>
          <div className="mt-1 text-xs text-slate-600">Baseado em retiradas (qty * unitCost quando disponível).</div>

          <div className="mt-3 space-y-2">
            {modelCostByCompany.length ? (
              modelCostByCompany.map(r => (
                <div key={r.company} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm font-semibold text-slate-800">{r.company}</div>
                  <div className="text-sm font-bold text-slate-900">{money(r.cost)}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                Sem dados de custo ainda.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900">Custo por Centro de Custo (modelo)</div>
          <div className="mt-1 text-xs text-slate-600">Agrupa por project.costCenter.</div>

          <div className="mt-3 space-y-2">
            {modelCostByCostCenter.length ? (
              modelCostByCostCenter.map(r => (
                <div key={r.costCenter} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm font-semibold text-slate-800">{r.costCenter}</div>
                  <div className="text-sm font-bold text-slate-900">{money(r.cost)}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                Sem dados de centro de custo ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}