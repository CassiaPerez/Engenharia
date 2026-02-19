
import React, { useState, useRef, useMemo } from 'react';
import { OS, User, OSStatus, Project, Building, ServiceType, Material, Equipment } from '../types';
import ModalPortal from './ModalPortal';
import { supabase, mapToSupabase } from '../services/supabase';

interface Props {
  user: User;
  oss: OS[];
  setOss: React.Dispatch<React.SetStateAction<OS[]>>;
  projects: Project[];
  buildings: Building[];
  equipments?: Equipment[];
  materials?: Material[];
  services?: ServiceType[];
  onLogout: () => void;
}

const ExecutorPanel: React.FC<Props> = ({ user, oss, setOss, projects, buildings, equipments = [], materials = [], services = [], onLogout }) => {
  const [activeTab, setActiveTab] = useState<'TODO' | 'DONE' | 'CALENDAR'>('TODO');
  const [finishingOS, setFinishingOS] = useState<OS | null>(null);
  const [viewDetailOS, setViewDetailOS] = useState<OS | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [executionDescription, setExecutionDescription] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const translatePriority = (p: string) => {
      switch(p) {
          case 'LOW': return 'Baixa';
          case 'MEDIUM': return 'Média';
          case 'HIGH': return 'Alta';
          case 'CRITICAL': return 'Crítica';
          default: return p;
      }
  };

  const myOSs = useMemo(() => {
    return oss.filter(o => {
      const hasLegacyExecutor = o.executorId === user.id || o.executorId === user.email;
      const hasMultiExecutor = o.executorIds?.includes(user.id) || o.executorIds?.includes(user.email);
      return hasLegacyExecutor || hasMultiExecutor;
    });
  }, [oss, user]);
  
  const todoList = myOSs.filter(o => o.status !== OSStatus.COMPLETED && o.status !== OSStatus.CANCELED);
  const doneList = myOSs.filter(o => o.status === OSStatus.COMPLETED);

  const getContext = (os: OS) => {
    if (os.projectId) {
        const p = projects.find(x => x.id === os.projectId);
        return { name: p?.description, type: 'PROJETO', code: p?.code, location: p?.location, city: p?.city, equipment: null };
    } else if (os.buildingId) {
        const b = buildings.find(x => x.id === os.buildingId);
        return { name: b?.name, type: 'EDIFÍCIO', code: 'FACILITIES', location: b?.address, city: b?.city, equipment: null };
    } else if (os.equipmentId) {
        const e = equipments.find(x => x.id === os.equipmentId);
        return { name: e?.name || 'Equipamento', type: 'EQUIPAMENTO', code: e?.code || '---', location: e?.location || '', city: '', equipment: e };
    }
    return { name: 'Local Não Definido', type: '---', code: '---', location: '', city: '', equipment: null };
  };

  const handleGoogleCalendarSync = (os: OS) => {
    const context = getContext(os);
    
    const formatDateForGoogle = (dateStr: string) => {
        return new Date(dateStr).toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const start = os.startTime ? formatDateForGoogle(os.startTime) : formatDateForGoogle(os.openDate);
    const limit = new Date(os.limitDate); 
    const end = formatDateForGoogle(limit.toISOString());

    const title = encodeURIComponent(`OS ${os.number}: ${os.description.substring(0, 40)}...`);
    
    const serviceList = os.services.map(s => {
        const srv = services.find(x => x.id === s.serviceTypeId);
        return `- ${srv?.name || 'Serviço'} (${s.quantity}h)`;
    }).join('\n');

    const details = encodeURIComponent(
        `ATIVIDADE: ${os.description}\n\n` +
        `LOCAL: ${context.name} (${context.location}, ${context.city})\n\n` +
        `ESCOPO DETALHADO:\n${serviceList || 'Ver no App'}\n\n` +
        `PRIORIDADE: ${translatePriority(os.priority)}\n` +
        `Link do Sistema: CropService`
    );
    
    const location = encodeURIComponent(`${context.name}, ${context.city}`);
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${start}/${end}&add=${user.email}`;

    window.open(googleUrl, '_blank');
  };

  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay(); // 0 = Domingo
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

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

  const handleStart = async (e: React.MouseEvent, osId: string) => {
      e.stopPropagation();
      const os = oss.find(o => o.id === osId);
      if (!os) return;

      const updated = {
        status: OSStatus.IN_PROGRESS,
        startTime: os.startTime || new Date().toISOString()
      };
      setOss(prev => prev.map(o => o.id === osId ? { ...o, ...updated } : o));

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase({
              id: osId,
              ...os,
              ...updated
          }));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao atualizar OS:', e);
      }
  };

  const handlePause = async (e: React.MouseEvent, osId: string) => {
      e.stopPropagation();
      const reason = prompt('Motivo da pausa:');
      if (!reason) return;

      const os = oss.find(o => o.id === osId);
      if (!os) return;

      const pauseEntry = {
          timestamp: new Date().toISOString(),
          reason,
          userId: user.id,
          action: 'PAUSE' as const
      };

      const updated = {
          status: OSStatus.PAUSED,
          pauseReason: reason,
          pauseHistory: [...(os.pauseHistory || []), pauseEntry]
      };

      setOss(prev => prev.map(o => o.id === osId ? { ...o, ...updated } : o));

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase({
              id: osId,
              ...os,
              ...updated
          }));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao pausar OS:', e);
      }
  };

  const handleResume = async (e: React.MouseEvent, osId: string) => {
      e.stopPropagation();

      const os = oss.find(o => o.id === osId);
      if (!os) return;

      const resumeEntry = {
          timestamp: new Date().toISOString(),
          reason: 'Retomada',
          userId: user.id,
          action: 'RESUME' as const
      };

      const updated = {
          status: OSStatus.IN_PROGRESS,
          pauseReason: undefined,
          pauseHistory: [...(os.pauseHistory || []), resumeEntry]
      };

      setOss(prev => prev.map(o => o.id === osId ? { ...o, ...updated } : o));

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase({
              id: osId,
              ...os,
              ...updated
          }));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao retomar OS:', e);
      }
  };

  const openFinishModal = (e: React.MouseEvent, os: OS) => {
      e.stopPropagation();
      setFinishingOS(os);
      setPhotoPreview(null);
      setExecutionDescription('');
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => setPhotoPreview(evt.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const confirmFinish = async () => {
      if (!finishingOS || !photoPreview) return;
      const updated = {
          ...finishingOS,
          status: OSStatus.COMPLETED,
          endTime: new Date().toISOString(),
          completionImage: photoPreview,
          executionDescription: executionDescription || undefined
      };
      setOss(prev => prev.map(o => o.id === finishingOS.id ? updated : o));

      try {
          const { error } = await supabase.from('oss').upsert(mapToSupabase({
              id: finishingOS.id,
              ...updated
          }));
          if (error) throw error;
      } catch (e) {
          console.error('Erro ao finalizar OS:', e);
      }

      setFinishingOS(null);
      setPhotoPreview(null);
      setExecutionDescription('');
  };

  const handlePriorityChange = async (osId: string, newPriority: string) => {
      const p = newPriority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      setOss(prev => prev.map(o => o.id === osId ? { ...o, priority: p } : o));
      if (viewDetailOS && viewDetailOS.id === osId) {
          setViewDetailOS({ ...viewDetailOS, priority: p });
      }

      try {
          const os = oss.find(o => o.id === osId);
          if (os) {
              const { error } = await supabase.from('oss').upsert({
                  id: osId,
                  json_content: { ...os, priority: p }
              });
              if (error) throw error;
          }
      } catch (e) {
          console.error('Erro ao atualizar prioridade:', e);
      }
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
      const context = getContext(os);
      return (
        <div key={os.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden mb-4 group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${os.status === OSStatus.IN_PROGRESS ? 'bg-blue-500 animate-pulse' : os.status === OSStatus.COMPLETED ? 'bg-clean-primary' : 'bg-slate-300'}`}></div>

            <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{os.number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getPriorityColor(os.priority)}`}>{translatePriority(os.priority)}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{os.description}</h3>
                <p className="text-xs font-bold text-clean-primary mb-2 uppercase tracking-wide truncate">{context.code} - {context.type}</p>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-100 p-2 rounded-lg">
                        <i className="fas fa-wrench text-purple-600"></i>
                        <span className="font-bold text-purple-900">{os.type}</span>
                    </div>

                    {context.equipment && (
                        <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 p-2 rounded-lg">
                            <i className="fas fa-cogs text-blue-600"></i>
                            <div className="flex-1">
                                <span className="font-bold text-blue-900">{context.equipment.name}</span>
                                <span className="text-blue-600 ml-2">• {context.equipment.code}</span>
                                {context.equipment.location && (
                                    <span className="text-blue-500 ml-2 text-[10px]">({context.equipment.location})</span>
                                )}
                            </div>
                        </div>
                    )}

                    {!context.equipment && context.city && (
                        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 p-2 rounded-lg">
                            <i className="fas fa-map-marker-alt text-slate-600"></i>
                            <span className="font-medium text-slate-700">{context.city}</span>
                        </div>
                    )}
                </div>

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

                <div className="flex gap-2">
                   {os.status !== OSStatus.COMPLETED && os.status !== OSStatus.CANCELED && (
                       <>
                        {os.status === OSStatus.OPEN ? (
                            <button onClick={(e) => handleStart(e, os.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                                <i className="fas fa-play"></i> Iniciar
                            </button>
                        ) : os.status === OSStatus.PAUSED ? (
                            <button onClick={(e) => handleResume(e, os.id)} className="flex-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                                <i className="fas fa-play"></i> Retomar
                            </button>
                        ) : (
                             <>
                                <button onClick={(e) => handlePause(e, os.id)} className="flex-1 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                                    <i className="fas fa-pause"></i> Pausar
                                </button>
                                <button onClick={(e) => openFinishModal(e, os)} className="flex-1 bg-clean-primary hover:bg-green-700 active:scale-95 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                                    <i className="fas fa-camera"></i> Finalizar
                                </button>
                             </>
                        )}
                       </>
                   )}
                   <button onClick={() => setViewDetailOS(os)} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                       <i className="fas fa-eye"></i> Detalhes
                   </button>
                </div>
                
                {os.status === OSStatus.COMPLETED && os.completionImage && (
                    <div className="mt-2 relative">
                        <img src={os.completionImage} alt="Evidência" className="w-full h-32 object-cover rounded-lg border border-slate-200 opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm"><i className="fas fa-check-circle text-clean-primary mr-1"></i> Evidência Enviada</span>
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
      <aside className="hidden md:flex w-72 bg-[#001529] text-white flex-col border-r border-white/10 shadow-2xl relative z-20">
          <div className="h-24 flex items-center px-6 border-b border-white/10 bg-[#001529] shrink-0 gap-3">
              <div className="w-10 h-10 flex items-center justify-center text-clean-primary text-2xl">
                  <i className="fas fa-fingerprint"></i>
              </div>
              <div>
                  <h1 className="text-lg font-black text-white tracking-tighter leading-none">CropService</h1>
                  <span className="text-[10px] text-clean-primary font-bold uppercase tracking-widest block">Executor</span>
              </div>
          </div>

          <nav className="flex-1 py-8 px-4 space-y-2">
              <button 
                  onClick={() => setActiveTab('TODO')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'TODO' ? 'bg-clean-primary text-white border border-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <i className="fas fa-clipboard-list w-6 text-center text-lg"></i>
                  <span>Minhas Tarefas</span>
                  {todoList.length > 0 && <span className="ml-auto bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">{todoList.length}</span>}
              </button>

              <button 
                  onClick={() => setActiveTab('CALENDAR')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'CALENDAR' ? 'bg-clean-primary text-white border border-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <i className="fas fa-calendar-days w-6 text-center text-lg"></i>
                  <span>Agenda</span>
              </button>

              <button 
                  onClick={() => setActiveTab('DONE')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-sm font-bold ${activeTab === 'DONE' ? 'bg-clean-primary text-white border border-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                  <i className="fas fa-clock-rotate-left w-6 text-center text-lg"></i>
                  <span>Histórico</span>
              </button>
          </nav>

          <div className="p-4 border-t border-white/10 bg-[#000b14]">
              <div className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-[#001529] border border-white/20">
                  <div className="w-10 h-10 rounded-full bg-[#000b14] flex items-center justify-center font-bold text-white shadow-md border-2 border-blue-600">
                      {user.avatar || user.name.substr(0,2)}
                  </div>
                  <div className="overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-white/70 truncate">Prestador</p>
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
          <header className="md:hidden bg-[#001529] text-white p-6 shadow-md rounded-b-3xl shrink-0 z-10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-clean-primary flex items-center justify-center font-bold text-white border-2 border-blue-900 shadow-md">
                      {user.avatar || user.name.substr(0,2)}
                  </div>
                  <div>
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Olá, Prestador</p>
                      <h1 className="text-lg font-bold leading-none">{user.name.split(' ')[0]}</h1>
                  </div>
              </div>
              <button onClick={onLogout} className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center text-blue-300 hover:text-white transition-colors">
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
                                              <span className={`text-sm font-bold ${isToday && !isSelected ? 'text-clean-primary' : ''}`}>{day}</span>
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
          <button onClick={() => setActiveTab('TODO')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${activeTab === 'TODO' ? 'text-clean-primary bg-green-50' : 'text-slate-400'}`}>
              <i className="fas fa-clipboard-list text-xl"></i>
              <span className="text-[10px] font-bold uppercase">Tarefas</span>
          </button>
          <button onClick={() => setActiveTab('CALENDAR')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${activeTab === 'CALENDAR' ? 'text-clean-primary bg-green-50' : 'text-slate-400'}`}>
              <i className="fas fa-calendar-days text-xl"></i>
              <span className="text-[10px] font-bold uppercase">Agenda</span>
          </button>
          <button onClick={() => setActiveTab('DONE')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${activeTab === 'DONE' ? 'text-clean-primary bg-green-50' : 'text-slate-400'}`}>
              <i className="fas fa-clock-rotate-left text-xl"></i>
              <span className="text-[10px] font-bold uppercase">Histórico</span>
          </button>
      </nav>

      {/* --- DETAIL MODAL (Novo) --- */}
      {viewDetailOS && (
        <ModalPortal>
            <div className="fixed inset-0 z-[10000]">
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity" onClick={() => setViewDetailOS(null)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-center">
                <div className="relative bg-white rounded-2xl w-full max-w-lg mx-auto overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-slate-800 text-white font-mono text-xs font-bold px-2 py-0.5 rounded">{viewDetailOS.number}</span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${viewDetailOS.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{translatePriority(viewDetailOS.priority)}</span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 leading-tight">{viewDetailOS.description}</h3>
                        </div>
                        <button onClick={() => setViewDetailOS(null)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center transition-colors"><i className="fas fa-times"></i></button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 min-h-0">
                        {/* Contexto Local */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <h4 className="text-xs font-black text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-1.5"><i className="fas fa-map-marker-alt"></i> Local de Execução</h4>
                            <div className="text-sm text-slate-700 space-y-1">
                                <p><span className="font-bold">Vínculo:</span> {getContext(viewDetailOS).name}</p>
                                <p><span className="font-bold">Endereço:</span> {getContext(viewDetailOS).location}</p>
                                <p><span className="font-bold">Cidade:</span> {getContext(viewDetailOS).city}</p>
                            </div>
                            <button 
                                onClick={() => handleGoogleCalendarSync(viewDetailOS)}
                                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fab fa-google"></i> Adicionar à Minha Agenda
                            </button>
                        </div>

                        {/* Seleção de Prioridade (Nova Funcionalidade) */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                                <i className="fas fa-flag"></i> Informar Nível de Prioridade
                            </label>
                            <div className="flex gap-2">
                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => {
                                    const isSelected = viewDetailOS.priority === p;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => handlePriorityChange(viewDetailOS.id, p)}
                                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                                isSelected 
                                                ? getPriorityColor(p) + ' shadow-md scale-105' 
                                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {translatePriority(p)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Checklist Serviços */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <i className="fas fa-tasks text-clean-primary"></i> Checklist de Atividades
                            </h4>
                            <ul className="space-y-2">
                                {viewDetailOS.services.length > 0 ? viewDetailOS.services.map((s, idx) => {
                                    const srv = services?.find(x => x.id === s.serviceTypeId);
                                    return (
                                        <li key={idx} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="w-5 h-5 rounded border-2 border-slate-300 mt-0.5"></div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 leading-tight">{srv?.name || 'Serviço'}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{srv?.description || 'Executar conforme padrão.'}</p>
                                                <span className="inline-block mt-1 text-[10px] bg-slate-200 px-1.5 rounded font-bold text-slate-600">Estimado: {s.quantity}h</span>
                                            </div>
                                        </li>
                                    );
                                }) : <p className="text-sm text-slate-400 italic">Nenhum serviço específico listado. Seguir descrição geral.</p>}
                            </ul>
                        </div>

                        {/* Lista de Materiais */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <i className="fas fa-box-open text-orange-500"></i> Materiais Necessários
                            </h4>
                            <ul className="space-y-2">
                                {viewDetailOS.materials.length > 0 ? viewDetailOS.materials.map((m, idx) => {
                                    const mat = materials?.find(x => x.id === m.materialId);
                                    return (
                                        <li key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                            <span className="font-medium text-slate-700">{mat?.description || 'Material'}</span>
                                            <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">{m.quantity} {mat?.unit}</span>
                                        </li>
                                    );
                                }) : <p className="text-sm text-slate-400 italic">Nenhum material alocado previamente.</p>}
                            </ul>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 shrink-0">
                        <button onClick={() => setViewDetailOS(null)} className="flex-1 py-3 text-slate-600 font-bold text-sm bg-white border border-slate-300 rounded-xl hover:bg-slate-100">Fechar</button>
                        {viewDetailOS.status === OSStatus.OPEN && (
                            <button onClick={(e) => { handleStart(e, viewDetailOS.id); setViewDetailOS(null); }} className="flex-1 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md">Iniciar Agora</button>
                        )}
                        {viewDetailOS.status === OSStatus.IN_PROGRESS && (
                            <button onClick={(e) => { setViewDetailOS(null); openFinishModal(e, viewDetailOS); }} className="flex-1 py-3 bg-clean-primary text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-md">Finalizar</button>
                        )}
                    </div>
                </div>
              </div>
            </div>
        </ModalPortal>
      )}

      {/* --- FINISH MODAL --- */}
      {finishingOS && (
          <ModalPortal>
            <div className="fixed inset-0 z-[10000]">
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity" onClick={() => setFinishingOS(null)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col justify-end md:justify-center items-center">
                  <div className="relative w-full bg-white rounded-t-3xl md:rounded-3xl p-6 md:max-w-md md:mx-auto animate-in slide-in-from-bottom-10 duration-300 shadow-2xl">
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
                              <label className="block text-sm font-bold text-slate-900 mb-3">Descrição dos Serviços Executados</label>
                              <textarea
                                  value={executionDescription}
                                  onChange={(e) => setExecutionDescription(e.target.value)}
                                  placeholder="Descreva detalhadamente os serviços realizados..."
                                  className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-clean-primary focus:border-clean-primary resize-none text-sm"
                              />
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-slate-900 mb-3">Evidência Fotográfica (Obrigatório)</label>

                              {!photoPreview ? (
                                  <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:border-clean-primary hover:text-clean-primary transition-all group">
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
                              className="w-full py-4 bg-clean-primary disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-xl shadow-clean-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-emerald-700"
                          >
                              <i className="fas fa-check-double"></i> Confirmar Conclusão
                          </button>
                      </div>
                  </div>
              </div>
            </div>
          </ModalPortal>
      )}
    </div>
  );
};

export default ExecutorPanel;
