import React, { useState } from 'react';
import { OS, OSStatus, Project, Building, Equipment, ServiceType, Material, User, PauseEntry, StockMovement } from '../types';
import { supabase, mapToSupabase } from '../services/supabase';

interface ExecutorPanelProps {
  user: User;
  oss: OS[];
  setOss: React.Dispatch<React.SetStateAction<OS[]>>;
  projects: Project[];
  buildings: Building[];
  equipments: Equipment[];
  onLogout: () => void;
  services: ServiceType[];
  materials: Material[];
  setMaterials?: React.Dispatch<React.SetStateAction<Material[]>>;
  movements?: StockMovement[];
  setMovements?: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  users?: User[];
}

// ✅ Motivos padronizados de pausa
const PAUSE_REASONS = [
  'Aguardando material',
  'Aguardando equipamento / ferramenta',
  'Intervalo / Almoço',
  'Fim do expediente',
  'Aguardando liberação da área',
  'Aguardando aprovação / autorização',
  'Problema técnico imprevisto',
  'Outro motivo'
];

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica'
};

const ExecutorPanel: React.FC<ExecutorPanelProps> = ({
  user, oss, setOss, projects, buildings, equipments,
  onLogout, services, materials
}) => {

  // ✅ NOVO: Estado do modal de pausa com motivo + progresso realizado
  const [pauseModal, setPauseModal] = useState<{
    open: boolean;
    osId: string;
    reason: string;
    customReason: string;
    workDoneDescription: string;
  }>({ open: false, osId: '', reason: '', customReason: '', workDoneDescription: '' });

  // Estado do modal de conclusão
  const [completeModal, setCompleteModal] = useState<{
    open: boolean; osId: string; description: string;
  }>({ open: false, osId: '', description: '' });

  const [expandedOsId, setExpandedOsId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'minhas' | 'todas'>('minhas');
  const [saving, setSaving] = useState(false);

  // OS atribuídas a este executor (não concluídas/canceladas)
  const myOss = oss.filter(o =>
    (o.executorIds?.includes(user.id) || o.executorId === user.id) &&
    o.status !== OSStatus.COMPLETED && o.status !== OSStatus.CANCELED
  );

  const allActiveOss = oss.filter(o =>
    o.status !== OSStatus.COMPLETED && o.status !== OSStatus.CANCELED
  );

  const displayOss = viewMode === 'minhas' ? myOss : allActiveOss;

  const getTarget = (os: OS): string => {
    if (os.projectId) {
      const p = projects.find(x => x.id === os.projectId);
      return `Projeto: ${p?.code || '?'}`;
    }
    if (os.buildingId) {
      const b = buildings.find(x => x.id === os.buildingId);
      return `Edifício: ${b?.name || '?'}`;
    }
    if (os.equipmentId) {
      const e = equipments.find(x => x.id === os.equipmentId);
      return `Equip.: ${e?.name || '?'}`;
    }
    return '—';
  };

  const isLate = (os: OS) => new Date(os.limitDate) < new Date() && os.status !== OSStatus.COMPLETED;

  // Calcular horas efetivas trabalhadas (descontando pausas)
  const calcWorkedTime = (os: OS): string => {
    if (!os.startTime) return '—';
    const start = new Date(os.startTime).getTime();
    const end = os.endTime ? new Date(os.endTime).getTime() : Date.now();
    let pausedMs = 0;
    if (os.pauseHistory) {
      let lastPause: number | null = null;
      os.pauseHistory.forEach(e => {
        const t = new Date(e.timestamp).getTime();
        if (e.action === 'PAUSE') lastPause = t;
        else if (e.action === 'RESUME' && lastPause !== null) {
          pausedMs += t - lastPause;
          lastPause = null;
        }
      });
    }
    const totalMs = Math.max(0, end - start - pausedMs);
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const saveOs = async (updated: OS) => {
    const { error } = await supabase.from('oss').upsert(mapToSupabase(updated));
    if (error) console.error('Erro ao salvar OS:', error);
  };

  // Iniciar OS
  const handleStart = async (osId: string) => {
    const now = new Date().toISOString();
    const entry: PauseEntry = { timestamp: now, reason: 'Início do atendimento', userId: user.id, action: 'RESUME' };
    const updated = oss.map(o => o.id === osId
      ? { ...o, status: OSStatus.IN_PROGRESS, startTime: o.startTime || now, pauseHistory: [...(o.pauseHistory || []), entry] }
      : o
    );
    setOss(updated);
    await saveOs(updated.find(o => o.id === osId)!);
  };

  // ✅ NOVO: Abrir modal de pausa
  const openPauseModal = (osId: string) => {
    setPauseModal({ open: true, osId, reason: '', customReason: '', workDoneDescription: '' });
  };

  // ✅ NOVO: Confirmar pausa com entrada completa no histórico
  const confirmPause = async () => {
    const { osId, reason, customReason, workDoneDescription } = pauseModal;
    const finalReason = reason === 'Outro motivo' ? (customReason.trim() || 'Outro motivo') : reason;
    if (!finalReason) { alert('Selecione o motivo da pausa.'); return; }

    setSaving(true);
    const entry: PauseEntry = {
      timestamp: new Date().toISOString(),
      reason: finalReason,
      workDoneDescription: workDoneDescription.trim() || undefined,
      userId: user.id,
      action: 'PAUSE'
    };

    const updated = oss.map(o => o.id === osId
      ? { ...o, status: OSStatus.PAUSED, pauseReason: finalReason, pauseHistory: [...(o.pauseHistory || []), entry] }
      : o
    );
    setOss(updated);
    await saveOs(updated.find(o => o.id === osId)!);
    setPauseModal({ open: false, osId: '', reason: '', customReason: '', workDoneDescription: '' });
    setSaving(false);
  };

  // Retomar OS pausada
  const handleResume = async (osId: string) => {
    const entry: PauseEntry = { timestamp: new Date().toISOString(), reason: 'Retomada pelo executor', userId: user.id, action: 'RESUME' };
    const updated = oss.map(o => o.id === osId
      ? { ...o, status: OSStatus.IN_PROGRESS, pauseReason: undefined, pauseHistory: [...(o.pauseHistory || []), entry] }
      : o
    );
    setOss(updated);
    await saveOs(updated.find(o => o.id === osId)!);
  };

  // Abrir modal de conclusão
  const openCompleteModal = (osId: string) => setCompleteModal({ open: true, osId, description: '' });

  const confirmComplete = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const updated = oss.map(o => o.id === completeModal.osId
      ? { ...o, status: OSStatus.COMPLETED, endTime: now, executionDescription: completeModal.description }
      : o
    );
    setOss(updated);
    await saveOs(updated.find(o => o.id === completeModal.osId)!);
    setCompleteModal({ open: false, osId: '', description: '' });
    setSaving(false);
  };

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    OPEN:        { label: 'Aberta',       color: 'bg-slate-100 text-slate-700', icon: 'fa-circle-dot' },
    IN_PROGRESS: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700',   icon: 'fa-play-circle' },
    PAUSED:      { label: 'Pausada',      color: 'bg-amber-100 text-amber-700', icon: 'fa-pause-circle' },
    COMPLETED:   { label: 'Concluída',    color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
    CANCELED:    { label: 'Cancelada',    color: 'bg-red-100 text-red-700',     icon: 'fa-times-circle' },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-[#001529] text-white px-4 py-3 flex items-center justify-between shadow-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
            {user.avatar || user.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{user.name}</p>
            <p className="text-xs text-blue-300 leading-tight">Executor · {myOss.length} OS ativa(s)</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors">
          <i className="fas fa-sign-out-alt"></i> Sair
        </button>
      </header>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">

        {/* Toggle Minhas / Todas */}
        <div className="flex gap-2 pt-2">
          <button onClick={() => setViewMode('minhas')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'minhas' ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200'}`}>
            Minhas OS ({myOss.length})
          </button>
          <button onClick={() => setViewMode('todas')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'todas' ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200'}`}>
            Todas Ativas ({allActiveOss.length})
          </button>
        </div>

        {/* Lista de OS */}
        {displayOss.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <i className="fas fa-check-circle text-5xl mb-4 block text-green-300"></i>
            <p className="font-semibold text-base">Nenhuma OS pendente!</p>
            <p className="text-sm mt-1">Todas as ordens estão concluídas ou aguardando atribuição.</p>
          </div>
        )}

        {displayOss.map(os => {
          const st = statusConfig[os.status] || statusConfig.OPEN;
          const late = isLate(os);
          const expanded = expandedOsId === os.id;

          return (
            <div key={os.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 transition-all ${
              os.status === OSStatus.PAUSED ? 'border-amber-400' :
              os.status === OSStatus.IN_PROGRESS ? 'border-blue-500' :
              late ? 'border-red-400' : 'border-slate-200'
            }`}>

              {/* Cabeçalho do card */}
              <div className="p-4 cursor-pointer" onClick={() => setExpandedOsId(expanded ? null : os.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="font-black text-blue-700 text-sm font-mono">{os.number}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
                        <i className={`fas ${st.icon} text-[10px]`}></i> {st.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${PRIORITY_BADGE[os.priority]}`}>
                        {PRIORITY_LABEL[os.priority]}
                      </span>
                      {late && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                          <i className="fas fa-clock mr-0.5"></i>SLA Atrasado
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{os.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{getTarget(os)}</p>
                  </div>
                  <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-slate-300 mt-1 shrink-0`}></i>
                </div>

                {/* Info rápida */}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  <span><i className="fas fa-calendar-plus mr-1 text-slate-300"></i>Aberta: {new Date(os.openDate).toLocaleDateString('pt-BR')}</span>
                  <span><i className={`fas fa-flag mr-1 ${late ? 'text-red-400' : 'text-slate-300'}`}></i>
                    Limite: <span className={late ? 'text-red-600 font-bold' : ''}>{new Date(os.limitDate).toLocaleDateString('pt-BR')}</span>
                  </span>
                  {os.startTime && (
                    <span><i className="fas fa-stopwatch mr-1 text-slate-300"></i>Trabalhado: {calcWorkedTime(os)}</span>
                  )}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="px-4 pb-4 flex gap-2 flex-wrap">
                {os.status === OSStatus.OPEN && (
                  <button onClick={() => handleStart(os.id)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                    <i className="fas fa-play mr-1.5"></i>Iniciar OS
                  </button>
                )}
                {os.status === OSStatus.IN_PROGRESS && (<>
                  <button onClick={() => openPauseModal(os.id)}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors">
                    <i className="fas fa-pause mr-1.5"></i>Pausar
                  </button>
                  <button onClick={() => openCompleteModal(os.id)}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors">
                    <i className="fas fa-check mr-1.5"></i>Concluir
                  </button>
                </>)}
                {os.status === OSStatus.PAUSED && (<>
                  <button onClick={() => handleResume(os.id)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                    <i className="fas fa-play mr-1.5"></i>Retomar
                  </button>
                  <button onClick={() => openCompleteModal(os.id)}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors">
                    <i className="fas fa-check mr-1.5"></i>Concluir
                  </button>
                </>)}
              </div>

              {/* ✅ SEÇÃO EXPANDIDA: Histórico de Atividade + Detalhes */}
              {expanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">

                  {/* Motivo da pausa atual */}
                  {os.status === OSStatus.PAUSED && os.pauseReason && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-amber-700 mb-1">
                        <i className="fas fa-pause-circle mr-1"></i>Motivo da pausa atual
                      </p>
                      <p className="text-sm text-amber-900">{os.pauseReason}</p>
                    </div>
                  )}

                  {/* ✅ NOVO: Histórico completo de pausas/retomadas */}
                  {os.pauseHistory && os.pauseHistory.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <i className="fas fa-history mr-1"></i>Histórico de Atividade
                      </p>
                      <div className="space-y-2">
                        {os.pauseHistory.map((entry, idx) => (
                          <div key={idx} className={`rounded-xl p-3 border-l-2 text-xs ${
                            entry.action === 'PAUSE'
                              ? 'bg-amber-50 border-amber-400'
                              : 'bg-green-50 border-green-400'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold">
                                {entry.action === 'PAUSE' ? '⏸ Pausado' : '▶ Iniciado / Retomado'}
                              </span>
                              <span className="text-slate-400">
                                {new Date(entry.timestamp).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                              </span>
                            </div>
                            {entry.reason && entry.reason !== 'Início do atendimento' && entry.reason !== 'Retomada pelo executor' && (
                              <p className="text-slate-700"><span className="font-semibold">Motivo:</span> {entry.reason}</p>
                            )}
                            {(entry.reason === 'Início do atendimento' || entry.reason === 'Retomada pelo executor') && (
                              <p className="text-green-700 italic">{entry.reason}</p>
                            )}
                            {/* ✅ Descrição do trabalho realizado antes da pausa */}
                            {entry.workDoneDescription && (
                              <div className="mt-2 bg-white/70 border border-amber-200 rounded-lg p-2">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-0.5">Trabalho realizado até aqui:</p>
                                <p className="text-slate-800">{entry.workDoneDescription}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Materiais usados */}
                  {os.materials.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <i className="fas fa-boxes mr-1"></i>Materiais Utilizados
                      </p>
                      <div className="space-y-1">
                        {os.materials.map((item, idx) => {
                          const mat = materials.find(m => m.id === item.materialId);
                          return (
                            <div key={idx} className="flex justify-between items-center bg-white rounded-lg p-2 border border-slate-100 text-xs">
                              <span className="text-slate-700 truncate flex-1">{mat?.description || item.materialId}</span>
                              <span className="font-bold text-slate-900 ml-2 shrink-0">{item.quantity} {mat?.unit || ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Descrição de execução (quando concluída) */}
                  {os.executionDescription && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-green-700 mb-1">
                        <i className="fas fa-clipboard-check mr-1"></i>Descrição de Execução
                      </p>
                      <p className="text-sm text-green-900">{os.executionDescription}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ NOVO: Modal de Pausa com motivo + trabalho realizado */}
      {pauseModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-500 text-white px-5 py-4 flex items-center gap-2">
              <i className="fas fa-pause-circle text-xl"></i>
              <h3 className="font-bold text-lg">Pausar Ordem de Serviço</h3>
            </div>
            <div className="p-5 space-y-4">

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Motivo da pausa <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={pauseModal.reason}
                  onChange={e => setPauseModal(p => ({ ...p, reason: e.target.value }))}
                >
                  <option value="">Selecione o motivo...</option>
                  {PAUSE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {pauseModal.reason === 'Outro motivo' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Descreva o motivo</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Ex: aguardando autorização da gerência..."
                    value={pauseModal.customReason}
                    onChange={e => setPauseModal(p => ({ ...p, customReason: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  O que foi feito até agora?
                  <span className="text-slate-400 font-normal ml-1">(opcional — fica registrado no histórico)</span>
                </label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={4}
                  placeholder="Descreva o progresso realizado antes da pausa. Ex: Desmontagem concluída. Motor retirado. Aguardando peça de reposição para reassemblagem..."
                  value={pauseModal.workDoneDescription}
                  onChange={e => setPauseModal(p => ({ ...p, workDoneDescription: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setPauseModal({ open: false, osId: '', reason: '', customReason: '', workDoneDescription: '' })}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPause}
                disabled={saving || !pauseModal.reason}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i>Salvando...</> : <><i className="fas fa-pause mr-1"></i>Confirmar Pausa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conclusão */}
      {completeModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-green-600 text-white px-5 py-4 flex items-center gap-2">
              <i className="fas fa-check-circle text-xl"></i>
              <h3 className="font-bold text-lg">Concluir Ordem de Serviço</h3>
            </div>
            <div className="p-5">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Descrição do serviço realizado
                <span className="text-slate-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={4}
                placeholder="Descreva o que foi realizado para concluir esta OS..."
                value={completeModal.description}
                onChange={e => setCompleteModal(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setCompleteModal({ open: false, osId: '', description: '' })}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmComplete}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i>Salvando...</> : <><i className="fas fa-check mr-1"></i>Concluir OS</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutorPanel;