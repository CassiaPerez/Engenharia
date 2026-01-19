import React, { useState, useMemo } from 'react';
import { Project, OS, Material, ServiceType } from '../types';

interface Props {
  projects: Project[];
  oss: OS[];
  materials?: Material[];
  services?: ServiceType[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'project' | 'os';
  status: string;
  color: string;
  data: Project | OS;
}

const Calendar: React.FC<Props> = ({ projects, oss, materials = [], services = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const events: CalendarEvent[] = useMemo(() => {
    const projectEvents: CalendarEvent[] = projects.map(p => ({
      id: p.id,
      title: `${p.code} - ${p.description}`,
      start: new Date(p.startDate),
      end: new Date(p.estimatedEndDate),
      type: 'project' as const,
      status: p.status,
      color: getProjectColor(p.status),
      data: p
    }));

    const osEvents: CalendarEvent[] = oss.map(o => ({
      id: o.id,
      title: `OS ${o.number} - ${o.description}`,
      start: new Date(o.openDate),
      end: new Date(o.limitDate),
      type: 'os' as const,
      status: o.status,
      color: getOSColor(o.priority),
      data: o
    }));

    return [...projectEvents, ...osEvents];
  }, [projects, oss]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const currentDay = new Date(year, month, day);
    const dayOfWeek = currentDay.getDay();

    const startOfWeek = new Date(currentDay);
    startOfWeek.setDate(day - dayOfWeek);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }

    return days;
  }, [currentDate]);

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      return (event.start <= dayEnd && event.end >= dayStart);
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getStatusLabel = (status: string, type: 'project' | 'os') => {
    if (type === 'project') {
      const labels: Record<string, string> = {
        PLANNED: 'Planejado',
        IN_PROGRESS: 'Em Progresso',
        PAUSED: 'Pausado',
        FINISHED: 'Finalizado',
        CANCELED: 'Cancelado'
      };
      return labels[status] || status;
    } else {
      const labels: Record<string, string> = {
        OPEN: 'Aberto',
        IN_PROGRESS: 'Em Progresso',
        PAUSED: 'Pausado',
        COMPLETED: 'Concluído',
        CANCELED: 'Cancelado'
      };
      return labels[status] || status;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Calendário de Serviços</h2>
          <p className="text-slate-500 text-base mt-1">Projetos e Ordens de Serviço Agendados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              view === 'month'
                ? 'bg-clean-primary text-white shadow-lg shadow-clean-primary/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              view === 'week'
                ? 'bg-clean-primary text-white shadow-lg shadow-clean-primary/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semana
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-2xl font-bold text-slate-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              Hoje
            </button>
            <div className="flex gap-2">
              <button
                onClick={view === 'month' ? previousMonth : previousWeek}
                className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button
                onClick={view === 'month' ? nextMonth : nextWeek}
                className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        {view === 'month' ? (
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {dayNames.map(day => (
              <div
                key={day}
                className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
            {daysInMonth.map((day, index) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isToday = day &&
                day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth() &&
                day.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={index}
                  className={`bg-white min-h-[120px] p-2 ${
                    !day ? 'bg-slate-50' : ''
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-bold mb-2 ${
                        isToday
                          ? 'w-7 h-7 rounded-full bg-clean-primary text-white flex items-center justify-center'
                          : 'text-slate-700'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className={`text-xs p-1.5 rounded ${event.color} truncate cursor-pointer hover:opacity-80 transition-opacity`}
                            title={event.title}
                          >
                            <i className={`fas ${event.type === 'project' ? 'fa-folder' : 'fa-wrench'} mr-1`}></i>
                            {event.title.substring(0, 15)}...
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-slate-500 font-bold pl-1.5">
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {weekDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isToday =
                day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth() &&
                day.getFullYear() === new Date().getFullYear();

              return (
                <div key={index} className="bg-white min-h-[400px]">
                  <div className={`p-3 border-b border-slate-200 ${
                    isToday ? 'bg-clean-primary/5' : ''
                  }`}>
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      {dayNames[day.getDay()]}
                    </div>
                    <div className={`text-2xl font-bold mt-1 ${
                      isToday
                        ? 'w-10 h-10 rounded-full bg-clean-primary text-white flex items-center justify-center'
                        : 'text-slate-700'
                    }`}>
                      {day.getDate()}
                    </div>
                  </div>
                  <div className="p-2 space-y-2">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={`text-xs p-2 rounded-lg ${event.color} cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        <div className="font-bold flex items-center gap-1 mb-1">
                          <i className={`fas ${event.type === 'project' ? 'fa-folder' : 'fa-wrench'}`}></i>
                          {event.type === 'project' ? 'Projeto' : 'OS'}
                        </div>
                        <div className="line-clamp-2">{event.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <i className="fas fa-folder text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Projetos</h3>
              <p className="text-2xl font-bold text-clean-primary">{projects.length}</p>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Em Progresso:</span>
              <span className="font-bold text-blue-600">
                {projects.filter(p => p.status === 'IN_PROGRESS').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Planejados:</span>
              <span className="font-bold text-slate-600">
                {projects.filter(p => p.status === 'PLANNED').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <i className="fas fa-wrench text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Ordens de Serviço</h3>
              <p className="text-2xl font-bold text-clean-primary">{oss.length}</p>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Abertas:</span>
              <span className="font-bold text-orange-600">
                {oss.filter(o => o.status === 'OPEN').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Em Progresso:</span>
              <span className="font-bold text-blue-600">
                {oss.filter(o => o.status === 'IN_PROGRESS').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i className="fas fa-calendar-check text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Este Mês</h3>
              <p className="text-2xl font-bold text-clean-primary">
                {events.filter(e => {
                  const eventMonth = e.start.getMonth();
                  const eventYear = e.start.getFullYear();
                  return eventMonth === currentDate.getMonth() && eventYear === currentDate.getFullYear();
                }).length}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-600">
            eventos agendados para {monthNames[currentDate.getMonth()]}
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className={`p-6 border-b border-slate-200 ${
              selectedEvent.type === 'project' ? 'bg-blue-50' : 'bg-orange-50'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm ${
                    selectedEvent.type === 'project'
                      ? 'bg-blue-500 text-white'
                      : 'bg-orange-500 text-white'
                  }`}>
                    <i className={`fas ${
                      selectedEvent.type === 'project' ? 'fa-folder' : 'fa-wrench'
                    } text-2xl`}></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {selectedEvent.type === 'project' ? 'Projeto' : 'Ordem de Serviço'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {selectedEvent.type === 'project'
                        ? (selectedEvent.data as Project).code
                        : `OS ${(selectedEvent.data as OS).number}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-10 h-10 rounded-lg hover:bg-white/50 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {selectedEvent.type === 'project' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                    <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as Project).description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                      <p className="text-base text-slate-800 mt-1 font-bold">
                        {getStatusLabel((selectedEvent.data as Project).status, 'project')}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                      <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as Project).category}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Início</label>
                      <p className="text-base text-slate-800 mt-1">
                        {formatDate((selectedEvent.data as Project).startDate)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previsão Término</label>
                      <p className="text-base text-slate-800 mt-1">
                        {formatDate((selectedEvent.data as Project).estimatedEndDate)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local</label>
                      <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as Project).location}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
                      <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as Project).city}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável</label>
                    <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as Project).responsible}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Área</label>
                      <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as Project).area}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Centro de Custo</label>
                      <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as Project).costCenter}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Valor Estimado</label>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {formatCurrency((selectedEvent.data as Project).estimatedValue)}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição Detalhada</label>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                      {(selectedEvent.data as Project).detailedDescription || 'Sem descrição detalhada'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                    <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as OS).description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                      <p className="text-base text-slate-800 mt-1 font-bold">
                        {getStatusLabel((selectedEvent.data as OS).status, 'os')}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                      <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as OS).type}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</label>
                      <p className={`text-base mt-1 font-bold ${
                        (selectedEvent.data as OS).priority === 'CRITICAL' ? 'text-red-600' :
                        (selectedEvent.data as OS).priority === 'HIGH' ? 'text-orange-600' :
                        (selectedEvent.data as OS).priority === 'MEDIUM' ? 'text-blue-600' :
                        'text-slate-600'
                      }`}>
                        {(selectedEvent.data as OS).priority === 'CRITICAL' ? 'Crítica' :
                         (selectedEvent.data as OS).priority === 'HIGH' ? 'Alta' :
                         (selectedEvent.data as OS).priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Abertura</label>
                      <p className="text-base text-slate-800 mt-1">
                        {formatDate((selectedEvent.data as OS).openDate)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Limite</label>
                      <p className="text-base text-slate-800 mt-1">
                        {formatDate((selectedEvent.data as OS).limitDate)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SLA</label>
                    <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as OS).slaHours} horas</p>
                  </div>

                  {(selectedEvent.data as OS).executorId && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executor</label>
                      <p className="text-base text-slate-800 mt-1">{(selectedEvent.data as OS).executorId}</p>
                    </div>
                  )}

                  {(selectedEvent.data as OS).materials && (selectedEvent.data as OS).materials.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Materiais Utilizados</label>
                      <div className="space-y-2">
                        {(selectedEvent.data as OS).materials.map((mat, idx) => {
                          const material = materials.find(m => m.id === mat.materialId);
                          return (
                            <div key={idx} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{material?.description || mat.materialId}</p>
                                <p className="text-xs text-slate-500">Quantidade: {mat.quantity}</p>
                              </div>
                              <span className="text-sm font-bold text-slate-700">
                                {formatCurrency(mat.unitCost * mat.quantity)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(selectedEvent.data as OS).services && (selectedEvent.data as OS).services.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Serviços Executados</label>
                      <div className="space-y-2">
                        {(selectedEvent.data as OS).services.map((srv, idx) => {
                          const service = services.find(s => s.id === srv.serviceTypeId);
                          return (
                            <div key={idx} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{service?.name || srv.serviceTypeId}</p>
                                <p className="text-xs text-slate-500">Horas: {srv.quantity}</p>
                              </div>
                              <span className="text-sm font-bold text-slate-700">
                                {formatCurrency(srv.unitCost * srv.quantity)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-3 bg-clean-primary text-white rounded-lg text-base font-bold hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getProjectColor(status: string): string {
  switch (status) {
    case 'PLANNED': return 'bg-slate-100 text-slate-700 border border-slate-300';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border border-blue-300';
    case 'PAUSED': return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
    case 'FINISHED': return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
    case 'CANCELED': return 'bg-red-100 text-red-700 border border-red-300';
    default: return 'bg-slate-100 text-slate-700 border border-slate-300';
  }
}

function getOSColor(priority: string): string {
  switch (priority) {
    case 'LOW': return 'bg-slate-100 text-slate-700 border border-slate-300';
    case 'MEDIUM': return 'bg-blue-100 text-blue-700 border border-blue-300';
    case 'HIGH': return 'bg-orange-100 text-orange-700 border border-orange-300';
    case 'CRITICAL': return 'bg-red-100 text-red-700 border border-red-300';
    default: return 'bg-slate-100 text-slate-700 border border-slate-300';
  }
}

export default Calendar;
