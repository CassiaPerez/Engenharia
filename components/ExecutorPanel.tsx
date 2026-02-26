import React, { useMemo, useState } from "react";
import {
  COMPANY_OPTIONS,
  Execution,
  formatDateBR,
  formatDateTimeBR,
  inferCompanyFrom,
  isOverdue,
  MaterialWithdrawal,
  msToHours,
  OS,
  PauseEvent,
  Project,
  ReportPeriod,
  safeText,
} from "../types";
import { engine } from "../services/engine";

type Props = {
  currentUserId: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonthISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

export default function ExecutorPanel({ currentUserId }: Props) {
  const [db, setDb] = useState(() => engine.load());
  const reload = () => setDb(engine.load());

  const currentUser = db.users.find(u => u.id === currentUserId);

  const myName = currentUser?.name || "Executor";

  const myOpenOS = useMemo(() => {
    return db.os.filter(o => {
      const execs = o.executors || [];
      return execs.some(e => e.id === currentUserId) && o.status !== "Finalizada" && o.status !== "Cancelada";
    });
  }, [db.os, currentUserId]);

  // UI: pause modal
  const [pauseModal, setPauseModal] = useState<{
    osId: string;
    osCode: string;
    executorId: string;
  } | null>(null);

  const [pauseReason, setPauseReason] = useState("");
  const [pauseNote, setPauseNote] = useState("");

  function ensureExecution(os: OS, executorId: string, executorName: string): Execution {
    os.executions = os.executions || [];
    let ex = os.executions.find(e => e.executorId === executorId);
    if (!ex) {
      ex = {
        id: engine.uuid(),
        executorId,
        executorName,
        startedAt: new Date().toISOString(),
        paused: false,
        pauseHistory: [],
      };
      os.executions.unshift(ex);
    }
    ex.pauseHistory = ex.pauseHistory || [];
    return ex;
  }

  function doPause(osId: string, executorId: string, reason: string, note: string) {
    const db2 = engine.load();
    const os = db2.os.find(o => o.id === osId);
    if (!os) return;

    const ex = ensureExecution(os, executorId, myName);
    ex.paused = true;

    const ev: Omit<PauseEvent, "id"> = {
      type: "PAUSE",
      at: new Date().toISOString(),
      reason: reason || undefined,
      note: note || undefined,
      userId: currentUserId,
      userName: myName,
    };
    ex.pauseHistory = ex.pauseHistory || [];
    ex.pauseHistory.push({ ...ev, id: engine.uuid() });

    // status geral da OS permanece "Pausada" se você já usa isso na regra.
    // Mantém compatível: não alterei regras antigas, apenas adiciono histórico.
    os.status = "Pausada";

    engine.save(db2);
    reload();
  }

  function doResume(osId: string, executorId: string) {
    const db2 = engine.load();
    const os = db2.os.find(o => o.id === osId);
    if (!os) return;

    const ex = ensureExecution(os, executorId, myName);
    ex.paused = false;

    const ev: Omit<PauseEvent, "id"> = {
      type: "RESUME",
      at: new Date().toISOString(),
      userId: currentUserId,
      userName: myName,
    };

    ex.pauseHistory = ex.pauseHistory || [];
    ex.pauseHistory.push({ ...ev, id: engine.uuid() });

    // mantem compatibilidade: volta "Em Execução"
    os.status = "Em Execução";

    engine.save(db2);
    reload();
  }

  function renderPauseHistory(os: OS) {
    const myExec = (os.executions || []).find(e => e.executorId === currentUserId);
    const ph = myExec?.pauseHistory || [];
    if (!ph.length) return null;

    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-sm font-semibold text-slate-700">Histórico de pausas</div>
        <div className="mt-2 space-y-2">
          {ph
            .slice()
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .map(ev => (
              <div key={ev.id} className="rounded-lg border border-slate-200 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700">
                    {ev.type === "PAUSE" ? "PAUSA" : "RETORNO"}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTimeBR(ev.at)}</div>
                </div>
                {ev.reason ? <div className="text-xs text-slate-600 mt-1">Motivo: {ev.reason}</div> : null}
                {ev.note ? <div className="text-xs text-slate-600 mt-1">Feito até aqui: {ev.note}</div> : null}
                {ev.userName ? <div className="text-[11px] text-slate-500 mt-1">por {ev.userName}</div> : null}
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3">
        <div className="text-xl font-bold text-slate-800">Painel do Executor</div>
        <div className="text-sm text-slate-600">Bem-vindo(a), {myName}</div>
      </div>

      {myOpenOS.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
          Nenhuma OS atribuída em andamento.
        </div>
      ) : (
        <div className="space-y-3">
          {myOpenOS.map(os => {
            const myExec = (os.executions || []).find(e => e.executorId === currentUserId);
            const isPaused = !!myExec?.paused;

            return (
              <div key={os.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{os.code}</div>
                    <div className="text-base font-bold text-slate-900">{os.title}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Abertura: <span className="font-semibold">{formatDateBR(os.createdAt)}</span>
                      {os.dueAt ? (
                        <>
                          {" "}
                          • Prazo: <span className="font-semibold">{formatDateBR(os.dueAt)}</span>{" "}
                          {isOverdue(os) ? <span className="ml-1 text-red-600 font-semibold">(SLA atrasado)</span> : null}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPaused ? (
                      <button
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        onClick={() => doResume(os.id, currentUserId)}
                      >
                        Retomar
                      </button>
                    ) : (
                      <button
                        className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                        onClick={() =>
                          setPauseModal({
                            osId: os.id,
                            osCode: os.code,
                            executorId: currentUserId,
                          })
                        }
                      >
                        Pausar
                      </button>
                    )}
                  </div>
                </div>

                {os.description ? <div className="mt-2 text-sm text-slate-700">{os.description}</div> : null}

                {renderPauseHistory(os)}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PAUSA */}
      {pauseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="text-lg font-bold text-slate-900">Pausar OS {pauseModal.osCode}</div>
            <div className="mt-2">
              <label className="block text-xs font-semibold text-slate-600">Motivo da pausa (opcional)</label>
              <input
                value={pauseReason}
                onChange={e => setPauseReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Ex.: aguardando peça / reunião / falta de energia..."
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-600">
                O que foi feito até agora (antes da pausa) (opcional)
              </label>
              <textarea
                value={pauseNote}
                onChange={e => setPauseNote(e.target.value)}
                className="mt-1 min-h-[90px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Descreva o progresso até o momento (para histórico e relatório)..."
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setPauseModal(null);
                  setPauseReason("");
                  setPauseNote("");
                }}
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                onClick={() => {
                  doPause(pauseModal.osId, pauseModal.executorId, pauseReason, pauseNote);
                  setPauseModal(null);
                  setPauseReason("");
                  setPauseNote("");
                }}
              >
                Confirmar pausa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}