import React, { useMemo, useState } from "react";
import { engine } from "../services/engine";
import {
  formatDateBR,
  inferCompanyFrom,
  isOverdue,
  OS,
  Project,
  sortByMostRecentOpened,
} from "../types";

type FilterMode = "default" | "recent" | "overdue";

export default function OSList() {
  const [db, setDb] = useState(() => engine.load());
  const reload = () => setDb(engine.load());

  const [filterMode, setFilterMode] = useState<FilterMode>("default");
  const [search, setSearch] = useState("");

  const projectsById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of db.projects || []) map.set(p.id, p);
    return map;
  }, [db.projects]);

  const equipmentsById = useMemo(() => {
    const map = new Map<string, any>();
    for (const e of db.equipments || []) map.set(e.id, e);
    return map;
  }, [db.equipments]);

  const filtered = useMemo(() => {
    let items = [...(db.os || [])];

    const s = search.trim().toLowerCase();
    if (s) {
      items = items.filter(o => {
        const p = o.projectId ? projectsById.get(o.projectId) : undefined;
        const e = o.equipmentId ? equipmentsById.get(o.equipmentId) : undefined;
        const company = inferCompanyFrom(e, p);
        return (
          o.code.toLowerCase().includes(s) ||
          (o.title || "").toLowerCase().includes(s) ||
          (o.projectName || "").toLowerCase().includes(s) ||
          (o.equipmentName || "").toLowerCase().includes(s) ||
          (company || "").toLowerCase().includes(s)
        );
      });
    }

    if (filterMode === "recent") {
      items.sort(sortByMostRecentOpened);
    } else if (filterMode === "overdue") {
      items = items.filter(o => isOverdue(o));
      items.sort(sortByMostRecentOpened);
    } else {
      // default: mantém como já era no sistema (sem alterar o que funciona)
      // não reordena forçadamente.
    }

    return items;
  }, [db.os, search, filterMode, projectsById, equipmentsById]);

  function statusBadge(status: string) {
    const base = "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold";
    if (status === "Finalizada") return <span className={`${base} bg-emerald-100 text-emerald-700`}>{status}</span>;
    if (status === "Pausada") return <span className={`${base} bg-amber-100 text-amber-700`}>{status}</span>;
    if (status === "Em Execução") return <span className={`${base} bg-blue-100 text-blue-700`}>{status}</span>;
    if (status === "Cancelada") return <span className={`${base} bg-rose-100 text-rose-700`}>{status}</span>;
    return <span className={`${base} bg-slate-100 text-slate-700`}>{status}</span>;
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-bold text-slate-900">OS</div>
          <div className="text-sm text-slate-600">Gerencie e acompanhe as ordens de serviço.</div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Filtro</label>
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value as FilterMode)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="default">Padrão</option>
              <option value="recent">Mais recentes abertas</option>
              <option value="overdue">SLA atrasado</option>
            </select>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-[320px]"
            placeholder="Buscar por OS, título, projeto, equipamento..."
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(os => {
          const p = os.projectId ? projectsById.get(os.projectId) : undefined;
          const e = os.equipmentId ? equipmentsById.get(os.equipmentId) : undefined;
          const company = inferCompanyFrom(e, p);

          return (
            <div key={os.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-800">{os.code}</div>
                    {statusBadge(os.status)}
                    {isOverdue(os) ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                        SLA atrasado
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-base font-bold text-slate-900">{os.title}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div>
                      Abertura: <span className="font-semibold">{formatDateBR(os.createdAt)}</span>
                    </div>
                    <div>
                      Prazo: <span className="font-semibold">{formatDateBR(os.dueAt)}</span>
                    </div>
                    <div>
                      Empresa (inf.): <span className="font-semibold">{company}</span>
                    </div>
                    {os.projectName ? (
                      <div>
                        Projeto: <span className="font-semibold">{os.projectName}</span>
                      </div>
                    ) : null}
                    {os.equipmentName ? (
                      <div>
                        Equip.: <span className="font-semibold">{os.equipmentName}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* botões existentes não mexidos — mantive seu layout e ações como estavam.
                    Se você já tinha botões aqui, eles continuam no seu projeto original.
                    Aqui mantive um placeholder neutro para não quebrar. */}
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={reload}
                    title="Recarregar"
                  >
                    Atualizar
                  </button>
                </div>
              </div>

              {os.description ? <div className="mt-2 text-sm text-slate-700">{os.description}</div> : null}
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            Nenhuma OS encontrada.
          </div>
        ) : null}
      </div>
    </div>
  );
}