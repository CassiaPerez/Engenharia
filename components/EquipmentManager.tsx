import React, { useMemo, useState } from "react";
import { engine } from "../services/engine";
import { COMPANY_OPTIONS, Equipment } from "../types";

function emptyEquipment(): Equipment {
  return {
    id: engine.uuid(),
    name: "",
    description: "",
    location: "",
    company: "Não informado",
    sector: "",
    parentEquipmentId: null,
  };
}

export default function EquipmentManager() {
  const [db, setDb] = useState(() => engine.load());
  const reload = () => setDb(engine.load());

  const [form, setForm] = useState<Equipment>(() => emptyEquipment());
  const [search, setSearch] = useState("");

  const equipments = useMemo(() => db.equipments || [], [db.equipments]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return equipments;
    return equipments.filter(e => {
      return (
        (e.name || "").toLowerCase().includes(s) ||
        (e.description || "").toLowerCase().includes(s) ||
        (e.location || "").toLowerCase().includes(s) ||
        (e.company || "").toLowerCase().includes(s) ||
        (e.sector || "").toLowerCase().includes(s)
      );
    });
  }, [equipments, search]);

  const tree = useMemo(() => {
    const byCompany = new Map<string, Map<string, Equipment[]>>();
    for (const e of equipments) {
      const company = e.company || "Não informado";
      const sector = e.sector || "Sem setor";
      if (!byCompany.has(company)) byCompany.set(company, new Map());
      const bySector = byCompany.get(company)!;
      if (!bySector.has(sector)) bySector.set(sector, []);
      bySector.get(sector)!.push(e);
    }

    // ordenar por nome
    for (const [, bySector] of byCompany) {
      for (const [, list] of bySector) {
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      }
    }

    return byCompany;
  }, [equipments]);

  function save() {
    const payload: Equipment = {
      ...form,
      name: (form.name || "").trim(),
      description: (form.description || "").trim(),
      location: (form.location || "").trim(),
      company: form.company || "Não informado",
      sector: (form.sector || "").trim(),
      parentEquipmentId: form.parentEquipmentId || null,
    };

    if (!payload.name) return;

    // manter compatibilidade com legado: se company está definida e location está vazia, preencher location com company
    if (!payload.location && payload.company && payload.company !== "Não informado") {
      payload.location = payload.company;
    }

    engine.upsertEquipment(payload);
    reload();
    setForm(emptyEquipment());
  }

  function edit(e: Equipment) {
    setForm({ ...e });
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-bold text-slate-900">Equipamentos</div>
          <div className="text-sm text-slate-600">Cadastro + árvore de bens (empresa → setor → equipamento).</div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-[320px]"
          placeholder="Buscar equipamento..."
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* FORM */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900">Cadastrar / Editar</div>

          <div className="mt-3 grid gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Nome do equipamento</label>
              <input
                value={form.name || ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Ex.: Bomba, Motor, Pulverizador..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600">Descrição</label>
              <textarea
                value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Detalhes do equipamento..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Empresa</label>
                <select
                  value={form.company || "Não informado"}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value as any }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  {COMPANY_OPTIONS.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Setor</label>
                <input
                  value={form.sector || ""}
                  onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Ex.: Manutenção, Produção, Laboratório..."
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Local (legado)</label>
                <input
                  value={form.location || ""}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Se você já usa 'local', continue usando aqui."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Bem pai (opcional)</label>
                <select
                  value={form.parentEquipmentId || ""}
                  onChange={e => setForm(f => ({ ...f, parentEquipmentId: e.target.value || null }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Sem pai</option>
                  {equipments.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={save}
            >
              Salvar
            </button>
          </div>
        </div>

        {/* LIST + TREE */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Lista</div>
            <div className="mt-3 space-y-2">
              {filtered.length ? (
                filtered.map(e => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{e.name}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {e.company || "Não informado"} • {e.sector || "Sem setor"}
                        {e.location ? ` • ${e.location}` : ""}
                      </div>
                      {e.description ? <div className="mt-1 text-xs text-slate-600">{e.description}</div> : null}
                    </div>
                    <button
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => edit(e)}
                    >
                      Editar
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600">Nenhum equipamento.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Árvore de bens</div>
            <div className="mt-1 text-xs text-slate-600">Empresa → Setor → Equipamento</div>

            <div className="mt-3 space-y-3">
              {Array.from(tree.entries()).map(([company, bySector]) => (
                <div key={company} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-sm font-bold text-slate-900">{company}</div>

                  <div className="mt-2 space-y-2">
                    {Array.from(bySector.entries()).map(([sector, list]) => (
                      <div key={sector} className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs font-semibold text-slate-700">{sector}</div>
                        <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
                          {list.map(e => (
                            <li key={e.id}>{e.name}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {tree.size === 0 ? (
                <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                  Sem equipamentos cadastrados.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}