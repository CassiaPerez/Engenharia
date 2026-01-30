
import React, { useState } from 'react';
import { OS, Project, OSStatus, Material, ServiceType, User } from '../types';
import { calculateOSCosts } from '../services/engine';
import ModalPortal from './ModalPortal';

interface Props {
  oss: OS[];
  projects: Project[];
  materials: Material[];
  services: ServiceType[];
  users: User[];
}

const CalendarView: React.FC<Props> = ({ oss, projects, materials, services, users }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);

  // Navegação do Calendário
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Lógica de Geração do Grid
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Domingo

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Mapeamento de Eventos
  const getEventsForDay = (day: number) => {
    return oss.filter(os => {
      // Prioridade: Se tem data de início (agendado/executando), usa ela. Se não, usa a data limite (prazo).
      const targetDateStr = os.startTime || os.limitDate;
      if (!targetDateStr) return false;
      
      const targetDate = new Date(targetDateStr);
      return (
        targetDate.getDate() === day &&
        targetDate.getMonth() === currentDate.getMonth() &&
        targetDate.getFullYear() === currentDate.getFullYear() &&
        os.status !== OSStatus.CANCELED
      );
    });
  };

  const getStatusColor = (status: OSStatus) => {
    switch (status) {
      case OSStatus.OPEN: return 'bg-amber-100 text-amber-800 border-amber-200';
      case OSStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-200';
      case OSStatus.PAUSED: return 'bg-purple-100 text-purple-800 border-purple-200';
      case OSStatus.COMPLETED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header do Calendário */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Agenda de Serviços</h2>
           <p className="text-slate-500">Visão mensal de alocação e prazos.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow text-slate-600 transition-all">
                <i className="fas fa-chevron-left"></i>
            </button>
            <div className="min-w-[180px] text-center">
                <span className="text-lg font-bold text-slate-800 block capitalize">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
            </div>
            <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow text-slate-600 transition-all">
                <i className="fas fa-chevron-right"></i>
            </button>
            <div className="w-px h-8 bg-slate-300 mx-2"></div>
            <button onClick={goToToday} className="px-4 py-2 text-sm font-bold text-clean-primary hover:bg-white rounded-lg transition-all">
                Hoje
            </button>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         {/* Cabeçalho Dias da Semana */}
         <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span className="hidden md:inline">{day}</span>
                    <span className="md:hidden">{day.substr(0, 3)}</span>
                </div>
            ))}
         </div>

         {/* Dias */}
         <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] bg-slate-200 gap-px border-b border-slate-200">
             {blanksArray.map(blank => (
                 <div key={`blank-${blank}`} className="bg-slate-50/50"></div>
             ))}

             {daysArray.map(day => {
                 const events = getEventsForDay(day);
                 const isToday = 
                    day === new Date().getDate() && 
                    currentDate.getMonth() === new Date().getMonth() && 
                    currentDate.getFullYear() === new Date().getFullYear();

                 return (
                     <div key={day} className={`bg-white p-2 min-h-[140px] group transition-colors hover:bg-slate-50 ${isToday ? 'bg-blue-50/30' : ''}`}>
                         <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-clean-primary text-white shadow-md' : 'text-slate-700'}`}>
                                {day}
                            </span>
                            {events.length > 0 && <span className="text-[10px] font-bold text-slate-400">{events.length} itens</span>}
                         </div>

                         <div className="space-y-1.5 overflow-y-auto max-h-[110px] custom-scrollbar pr-1">
                             {events.map(os => {
                                 const proj = projects.find(p => p.id === os.projectId);
                                 const executor = users.find(u => u.id === os.executorId);
                                 return (
                                     <button 
                                        key={os.id}
                                        onClick={() => setSelectedOS(os)}
                                        className={`w-full text-left px-2 py-1.5 rounded border text-xs font-bold truncate shadow-sm hover:opacity-80 transition-all flex flex-col gap-0.5 ${getStatusColor(os.status)}`}
                                        title={`${os.number}: ${os.description}`}
                                     >
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${os.priority === 'CRITICAL' ? 'bg-red-500' : os.priority === 'HIGH' ? 'bg-orange-500' : 'bg-slate-400'}`}></div>
                                            <span className="truncate">{os.description}</span>
                                        </div>
                                        <div className="flex justify-between items-center w-full">
                                            <div className="text-[10px] opacity-75 truncate font-medium">
                                                {proj?.code}
                                            </div>
                                            {executor && (
                                                <div className="text-[9px] opacity-90 font-bold bg-black/10 px-1 rounded ml-1 truncate max-w-[60px]" title={executor.name}>
                                                    {executor.name.split(' ')[0]}
                                                </div>
                                            )}
                                        </div>
                                     </button>
                                 );
                             })}
                         </div>
                     </div>
                 );
             })}
         </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 px-2">
         <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span> Aberto</div>
         <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span> Em Andamento</div>
         <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></span> Pausado</div>
         <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200"></span> Concluído</div>
         <div className="h-4 w-px bg-slate-300 mx-2"></div>
         <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Prioridade Crítica</div>
      </div>

      {/* Modal de Detalhes - INFORMAÇÕES DA RESERVA */}
      {selectedOS && (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedOS(null)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-center">
                  <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 inline-block">{selectedOS.number}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusColor(selectedOS.status)}`}>{selectedOS.status}</span>
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{selectedOS.description}</h3>
                          </div>
                          <button onClick={() => setSelectedOS(null)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times"></i></button>
                      </div>
                      
                      <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 min-h-0">
                          {/* Detalhes Financeiros */}
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-500 uppercase">Estimativa Materiais</span>
                                  <p className="text-lg font-bold text-slate-800">R$ {formatCurrency(calculateOSCosts(selectedOS, materials, services).materialCost)}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <span className="text-xs font-bold text-slate-500 uppercase">Estimativa Serviços</span>
                                  <p className="text-lg font-bold text-slate-800">R$ {formatCurrency(calculateOSCosts(selectedOS, materials, services).serviceCost)}</p>
                              </div>
                          </div>

                          {/* Datas */}
                          <div>
                              <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Cronograma</h4>
                              <div className="text-sm text-slate-600 space-y-1">
                                  <p><strong>Abertura:</strong> {new Date(selectedOS.openDate).toLocaleString()}</p>
                                  <p><strong>Prazo Limite:</strong> {new Date(selectedOS.limitDate).toLocaleString()}</p>
                                  {selectedOS.startTime && <p><strong>Início Execução:</strong> {new Date(selectedOS.startTime).toLocaleString()}</p>}
                                  {selectedOS.endTime && <p><strong>Conclusão:</strong> {new Date(selectedOS.endTime).toLocaleString()}</p>}
                              </div>
                          </div>

                          {/* Executor */}
                          <div>
                              <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Responsável Técnico</h4>
                              <p className="text-sm text-slate-600">
                                  {users.find(u => u.id === selectedOS.executorId)?.name || 'Não Atribuído'}
                              </p>
                          </div>
                      </div>
                      
                      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                          <button onClick={() => setSelectedOS(null)} className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 transition-all">Fechar</button>
                      </div>
                  </div>
              </div>
            </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default CalendarView;
