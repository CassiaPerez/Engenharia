
import React, { useState, useRef, useMemo } from 'react';
import { OS, User, OSStatus, Project } from '../types';

interface Props {
  user: User;
  oss: OS[];
  setOss: React.Dispatch<React.SetStateAction<OS[]>>;
  projects: Project[];
  onLogout: () => void;
}

const ExecutorPanel: React.FC<Props> = ({ user, oss, setOss, projects, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'TODO' | 'DONE' | 'CALENDAR'>('TODO');
  const [finishingOS, setFinishingOS] = useState<OS | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Calendário
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Filtra apenas OS deste executor
  const myOSs = useMemo(() => {
    return oss.filter(o => o.executorId === user.id || o.executorId === user.email);
  }, [oss, user]);
  
  const todoList = myOSs.filter(o => o.status !== OSStatus.COMPLETED && o.status !== OSStatus.CANCELED);
  const doneList = myOSs.filter(o => o.status === OSStatus.COMPLETED);

  // --- Lógica do Calendário ---
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay(); // 0 = Domingo
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  // Verifica eventos para o dia
  const getDayStatus = (day: number) => {
      const checkDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
      const checkDateStr = checkDate.toDateString();

      const hasCompleted = myOSs.some(o => o.status === OSStatus.COMPLETED && o.endTime && new Date(o.endTime).toDateString() === checkDateStr);
      const hasScheduled = myOSs.some(o => {
          if (o.status === OSStatus.COMPLETED) return false;
          const target = o.startTime ? new Date(o.startTime) : new Date(o.limitDate);
          return target.toDateString() === checkDateStr;
      });

      return { hasCompleted, hasScheduled };
  };

  // Lista de OSs do dia selecionado no calendário
  const selectedDayOSs = useMemo(() => {
      const dateStr = selectedDay.toDateString();
      return myOSs.filter(o => {
          if (o.status === OSStatus.COMPLETED && o.endTime) {
              return new Date(o.endTime).toDateString() === dateStr;
          }
          const target = o.startTime ? new Date(o.startTime) : new Date(o.limitDate);
          return target.toDateString() === dateStr;
      });
  }, [myOSs, selectedDay]);
  // --- Fim Lógica Calendário ---

  // Ordenação das Listas
  const getSortedList = () => {
      if (activeTab === 'TODO') {
          return [...todoList].sort((a, b) => {
            const pWeight: Record<string, number> = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
            const weightA = pWeight[a.priority] ?? 4;
            const weightB = pWeight[b.priority] ?? 4;
            return weightA - weightB;
          });
      }
      if (activeTab === 'DONE') {
          return [...doneList].sort((a, b) => new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime());
      }
      return [];
  };

  const currentList = getSortedList();

  const handleStart = (e: React.MouseEvent, osId: string) => {
      e.stopPropagation();
      // Removido confirm() para ação direta e sem bloqueios
      setOss(prev => prev.map(o => o.id === osId ? { ...o, status: OSStatus.IN_PROGRESS, startTime: new Date().toISOString() } : o));
  };

  const openFinishModal = (e: React.MouseEvent, os: OS) => {
      e.stopPropagation();
      setFinishingOS(os);
      setPhotoPreview(null);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => setPhotoPreview(evt.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const confirmFinish = () => {
      if (!finishingOS || !photoPreview) return;
      setOss(prev => prev.map(o => o.id === finishingOS.id ? { 
          ...o, 
          status: OSStatus.COMPLETED, 
          endTime: new Date().toISOString(),
          completionImage: photoPreview
      } : o));
      setFinishingOS(null);
      setPhotoPreview(null);
  };

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'CRITICAL': return 'bg-red-500 text-white border-red-600';
          case 'HIGH': return 'bg-orange-500 text-white border-orange-600';
          case 'MEDIUM': return 'bg-blue-500 text-white border-blue-600';
          default: return 'bg-slate-400 text-white border-slate-500';
      }
  };

  const renderOSCard = (os: OS) => {
      const project = projects.find(p => p.id === os.projectId);
      return (
        <div key={os.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden mb-4 group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${os.status === OSStatus.IN_PROGRESS ? 'bg-blue-500 animate-pulse' : os.status === OSStatus.COMPLETED ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
            
            <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{os.number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getPriorityColor(os.priority)}`}>{os.priority === 'CRITICAL' ? 'Crítica' : os.priority === 'HIGH' ? 'Alta' : os.priority === 'MEDIUM' ? 'Média' : 'Baixa'}</span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{os.description}</h3>
                <p className="text-xs font-bold text-emerald-600 mb-4 uppercase tracking-wide truncate">{project?.code} - {project?.city}</p>
                
                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mb-4 bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center gap-1.5">
                        <i className="fas fa-calendar"></i>
                        {new Date(os.limitDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <i className="fas fa-clock"></i>
                        {os.status === OSStatus.COMPLETED ? 'Finalizada' : `${os.slaHours}h SLA`}
                    </div>
                </div>

                {os.status !== OSStatus.COMPLETED && os.status !== OSStatus.CANCELED && (
                    <div className="grid grid-cols-2 gap-3">
                        {os.status === OSStatus.OPEN ? (
                            <button onClick={(e) => handleStart(e, os.id)} className="col-span-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2">
                                <i className="fas fa-play"></i> Iniciar Atividade
                            </button>
                        ) : (
                            <>
                              <button disabled className="bg-slate-100 text-blue-600 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-200 cursor-default opacity-70">
                                  <i className="fas fa-sync fa-spin"></i> Em Execução
                              </button>
                              <button onClick={(e) => openFinishModal(e, os)} className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2">
                                  <i className="fas fa-camera"></i> Finalizar
                              </button>
                            </>
                        )}
                    </div>
                )}
                
                {os.status === OSStatus.COMPLETED && os.completionImage && (
                    <div className="mt-2 relative">
                        <img src={os.completionImage} alt="Evidência" className="w-full h-32 object-cover rounded-lg border border-slate-200 opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm"><i className="fas fa-check-circle text-emerald-400 mr-1"></i> Evidência Enviada</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      
      {/* --- SIDEBAR (Desktop/Tablet) --- */}
      <aside className="hidden md:flex w-72 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 shadow-2xl relative z-20">
          <div className="h-24 flex items-center px-6 border-b border-slate-800 bg-slate-950 shrink-0 gap-3">
              <div className="w-10 h-10 flex items-center justify-center text-emerald-500 text-2xl">
                  <i className="fas fa-fingerprint"></i>
              </div>
              <div>
                  <h1 className="text-lg font-black text-white tracking-tighter leading-none">CropService</h1>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block">Executor</span>
              </div>
          </div>

          <nav className="flex-1 py-8 px-4 space-y-2">
              <button 
                  onClick={() => setActiveTab('TODO')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'TODO' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <i className="fas fa-clipboard-list w-6 text-center text-lg"></i>
                  <span>Minhas Tarefas</span>
                  {todoList.length > 0 && <span className="ml-auto bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">{todoList.length}</span>}
              </button>

              <button 
                  onClick={() => setActiveTab('CALENDAR')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'CALENDAR' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <i className="fas fa-calendar-days w-6 text-center text-lg"></i>
                  <span>Agenda</span>
              </button>

              <button 
                  onClick={() => setActiveTab('DONE')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'DONE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <i className="fas fa-clock-rotate-left w-6 text-center text-lg"></i>
                  <span>Histórico</span>
              </button>
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md border-2 border-slate-700">
                      {user.avatar || user.name.substr(0,2)}
                  </div>
                  <div className="overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">Prestador</p>
                  </div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors uppercase tracking-wider">
                  <i className="fas fa-sign-out-alt"></i> Sair do Sistema
              </button>
          </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100">
          
          {/* Header Mobile (Only visible on small screens) */}
          <header className="md:hidden bg-slate-900 text-white p-6 shadow-md rounded-b-3xl shrink-0 z-10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white border-2 border-slate-800 shadow-md">
                      {user.avatar || user.name.substr(0,2)}
                  </div>
                  <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Olá, Prestador</p>
                      <h1 className="text-lg font-bold leading-none">{user.name.split(' ')[0]}</h1>
                  </div>
              </div>
              <button onClick={onLogout} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <i className="fas fa-sign-out-alt"></i>
              </button>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
              <div className="max-w-4xl mx-auto">
                  
                  {/* Page Title (Desktop only) */}
                  <div className="hidden md:block mb-8">
                      <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                          {activeTab === 'TODO' ? 'Tarefas Pendentes' : activeTab === 'CALENDAR' ? 'Minha Agenda' : 'Histórico de Atividades'}
                      </h2>
                      <p className="text-slate-500">
                          {activeTab === 'TODO' ? 'Gerencie suas ordens de serviço ativas.' : activeTab === 'CALENDAR' ? 'Visualize seus compromissos futuros.' : 'Registro de serviços concluídos.'}
                      </p>
                  </div>

                  {/* TAB: CALENDAR */}
                  {activeTab === 'CALENDAR' && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
                              <div className="flex justify-between items-center mb-6">
                                  <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><i className="fas fa-chevron-left"></i></button>
                                  <h2 className="font-bold text-xl text-slate-800 capitalize">{calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                                  <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><i className="fas fa-chevron-right"></i></button>
                              </div>

                              <div className="grid grid-cols-7 mb-2 text-center">
                                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                      <div key={i} className="text-xs font-bold text-slate-400 uppercase">{d}</div>
                                  ))}
                              </div>

                              <div className="grid grid-cols-7 gap-1 md:gap-2">
                                  {blanksArray.map(b => <div key={`blank-${b}`} className="aspect-square"></div>)}
                                  {daysArray.map(day => {
                                      const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                                      const isSelected = date.toDateString() === selectedDay.toDateString();
                                      const isToday = date.toDateString() === new Date().toDateString();
                                      const { hasCompleted, hasScheduled } = getDayStatus(day);

                                      return (
                                          <button 
                                              key={day} 
                                              onClick={() => setSelectedDay(date)}
                                              className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${isSelected ? 'bg-slate-800 text-white shadow-lg scale-105 z-10' : 'hover:bg-slate-50 text-slate-700 bg-slate-50/50'}`}
                                          >
                                              <span className={`text-sm font-bold ${isToday && !isSelected ? 'text-emerald-600' : ''}`}>{day}</span>
                                              <div className="flex gap-0.5 mt-1.5 h-2">
                                                  {hasCompleted && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>}
                                                  {hasScheduled && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-blue-500'}`}></div>}
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                              <div className="flex justify-center gap-6 mt-6 text-[10px] font-bold uppercase text-slate-500">
                                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Agendado</div>
                                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Concluído</div>
                              </div>
                          </div>

                          <div>
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
                                  <i className="fas fa-calendar-day"></i> Agenda de {selectedDay.toLocaleDateString('pt-BR')}
                              </h3>
                              {selectedDayOSs.length === 0 ? (
                                  <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                                      <i className="far fa-calendar-times text-3xl mb-3 opacity-50"></i>
                                      <p className="font-medium">Nenhuma atividade agendada.</p>
                                  </div>
                              ) : (
                                  <div className="grid grid-cols-1 gap-4">
                                    {selectedDayOSs.map(renderOSCard)}
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {/* TAB: LISTS */}
                  {(activeTab === 'TODO' || activeTab === 'DONE') && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {currentList.length === 0 && (
                            <div className="text-center py-20 opacity-60 bg-white rounded-2xl border border-dashed border-slate-200">
                                <i className="fas fa-clipboard-check text-5xl mb-4 text-slate-300"></i>
                                <p className="font-bold text-slate-500 text-lg">Tudo limpo por aqui!</p>
                                <p className="text-sm text-slate-400">Nenhuma ordem de serviço encontrada.</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4">
                            {currentList.map(renderOSCard)}
                        </div>
                      </div>
                  )}
              </div>
          </div>
      </main>

      {/* --- BOTTOM NAVIGATION (Mobile Only) --- */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-2 z-30 pb-safe">
          <button onClick={() => setActiveTab('TODO')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${activeTab === 'TODO' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
              <i className="fas fa-clipboard-list text-xl"></i>
              <span className="text-[10px] font-bold uppercase">Tarefas</span>
          </button>
          <button onClick={() => setActiveTab('CALENDAR')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${activeTab === 'CALENDAR' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
              <i className="fas fa-calendar-days text-xl"></i>
              <span className="text-[10px] font-bold uppercase">Agenda</span>
          </button>
          <button onClick={() => setActiveTab('DONE')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${activeTab === 'DONE' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
              <i className="fas fa-clock-rotate-left text-xl"></i>
              <span className="text-[10px] font-bold uppercase">Histórico</span>
          </button>
      </nav>

      {/* --- FINISH MODAL --- */}
      {finishingOS && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex flex-col justify-end md:justify-center p-4">
              <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 md:max-w-md md:mx-auto animate-in slide-in-from-bottom-10 duration-300 w-full">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Finalizar Serviço</h3>
                      <button onClick={() => setFinishingOS(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><i className="fas fa-times"></i></button>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                              <span className="bg-slate-200 px-2 py-0.5 rounded text-xs">{finishingOS.number}</span>
                              <span className="truncate flex-1">{finishingOS.description}</span>
                          </p>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-900 mb-3">Evidência Fotográfica (Obrigatório)</label>
                          
                          {!photoPreview ? (
                              <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:border-emerald-500 hover:text-emerald-600 transition-all group">
                                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl mb-1 group-hover:scale-110 transition-transform">
                                      <i className="fas fa-camera"></i>
                                  </div>
                                  <span className="font-bold">Tirar Foto / Upload</span>
                              </button>
                          ) : (
                              <div className="relative group">
                                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                                  <button onClick={() => setPhotoPreview(null)} className="absolute top-3 right-3 bg-red-500 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"><i className="fas fa-trash"></i></button>
                              </div>
                          )}
                          <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              ref={fileInputRef} 
                              className="hidden" 
                              onChange={handlePhotoCapture} 
                          />
                      </div>

                      <button 
                          onClick={confirmFinish} 
                          disabled={!photoPreview}
                          className="w-full py-4 bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-emerald-700"
                      >
                          <i className="fas fa-check-double"></i> Confirmar Conclusão
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExecutorPanel;
