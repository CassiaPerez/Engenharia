
import React, { useState } from 'react';
import { Material, StockMovement } from '../types';

interface Props {
  materials: Material[];
  movements: StockMovement[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  onAddMovement: (mov: StockMovement) => void;
}

const Inventory: React.FC<Props> = ({ materials, movements, setMaterials, onAddMovement }) => {
  const [view, setView] = useState<'stock' | 'history'>('stock');
  const [searchTerm, setSearchTerm] = useState('');

  const handleManualAdjustment = (mId: string, type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN', qty: number, reason: string) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === mId) {
        let newQty = m.currentStock;
        if (type === 'IN' || type === 'RETURN') newQty += qty;
        else if (type === 'OUT') {
           if (m.currentStock < qty) {
             alert("Erro Industrial: Saldo insuficiente para requisição.");
             return m;
           }
           newQty -= qty;
        }
        else if (type === 'ADJUST') newQty = qty;
        
        onAddMovement({
          id: Math.random().toString(36).substr(2, 9),
          type,
          materialId: mId,
          quantity: qty,
          date: new Date().toISOString(),
          userId: 'ALMOXARIFE_MASTER',
          description: reason
        });
        
        return { ...m, currentStock: newQty };
      }
      return m;
    }));
  };

  const filteredMaterials = materials.filter(m => 
    m.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-slate-950 tracking-tight">Almoxarifado Industrial</h2>
          <p className="text-slate-500 font-medium text-sm">Giro de estoque e rastreabilidade de peças e insumos.</p>
        </div>
        <div className="flex gap-2 bg-slate-200 p-1.5 rounded-2xl self-stretch md:self-auto">
          <button 
            onClick={() => setView('stock')}
            className={`flex-1 md:px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'stock' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >Itens em Estoque</button>
          <button 
            onClick={() => setView('history')}
            className={`flex-1 md:px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >Movimentação Realtime</button>
        </div>
      </header>

      {view === 'stock' ? (
        <>
          <div className="flex bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm max-w-xl group focus-within:border-blue-500 transition-all">
            <i className="fas fa-search text-slate-300 mr-4 mt-1"></i>
            <input 
              type="text" 
              placeholder="Pesquisar por Código SAP, Descrição ou Grupo..." 
              className="bg-transparent text-sm font-bold outline-none w-full text-slate-700 placeholder:text-slate-300"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMaterials.map(m => (
              <div key={m.id} className={`bg-white rounded-[2.5rem] p-8 shadow-sm border transition-all group ${m.currentStock <= m.minStock ? 'border-red-200 bg-red-50/10' : 'border-slate-200 hover:shadow-2xl'}`}>
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${m.currentStock <= m.minStock ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white'}`}>
                    <i className="fas fa-box-open text-2xl"></i>
                  </div>
                  {m.currentStock <= m.minStock && (
                     <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase animate-pulse">Estoque Baixo</div>
                  )}
                </div>
                <h4 className="font-display font-black text-slate-900 text-lg mb-1 leading-tight min-h-[3rem]">{m.description}</h4>
                <div className="flex gap-2 mb-8">
                   <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 uppercase tracking-widest">{m.code}</span>
                   <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 uppercase tracking-widest">{m.group || 'Geral'}</span>
                </div>
                
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Saldo Físico</p>
                    <p className={`text-4xl font-display font-black ${m.currentStock <= m.minStock ? 'text-red-600' : 'text-slate-950'}`}>{m.currentStock} <span className="text-sm text-slate-400 font-sans font-bold">{m.unit}</span></p>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button onClick={() => { const q = prompt("Quantidade para Entrada Industrial:"); if (q) handleManualAdjustment(m.id, 'IN', Number(q), 'Entrada de Mercadoria'); }} className="py-4 bg-slate-950 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-slate-800 transition-all">Entrada</button>
                  <button onClick={() => { const q = prompt("Quantidade para Devolução:"); if (q) handleManualAdjustment(m.id, 'RETURN', Number(q), 'Devolução de Material'); }} className="py-4 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl hover:bg-slate-50 transition-all">Devolução</button>
                </div>
              </div>
            ))}
            {filteredMaterials.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                 <i className="fas fa-box-archive text-5xl text-slate-200 mb-4"></i>
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum item encontrado no catálogo industrial.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
          <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
             <h3 className="font-display font-black text-slate-900 text-xl tracking-tight">Registro de Auditoria Logística (Giro)</h3>
             <button onClick={() => window.print()} className="text-[10px] font-black text-blue-600 border border-blue-600 px-6 py-3 rounded-xl uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                Exportar Histórico
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase text-center">Tipo Operação</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase">Item / Descrição</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase text-center">Volume</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase">Vínculo OS / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...movements].reverse().map(mov => (
                  <tr key={mov.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-10 py-6 text-xs font-bold text-slate-500">{new Date(mov.date).toLocaleString('pt-BR')}</td>
                    <td className="px-10 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        mov.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 
                        mov.type === 'OUT' ? 'bg-rose-100 text-rose-700' : 
                        mov.type === 'RETURN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                      }`}>{mov.type}</span>
                    </td>
                    <td className="px-10 py-6">
                      <p className="font-black text-slate-950 text-sm">{materials.find(x=>x.id===mov.materialId)?.description || 'Item Excluído'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{materials.find(x=>x.id===mov.materialId)?.code}</p>
                    </td>
                    <td className="px-10 py-6 text-center font-display font-black text-slate-950 text-xl">{mov.quantity}</td>
                    <td className="px-10 py-6">
                      <p className="text-xs text-slate-900 font-black uppercase tracking-tight">{mov.osId ? `Requisição: ${mov.osId}` : 'Ajuste Sistêmico'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{mov.description}</p>
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={5} className="p-32 text-center text-slate-400 italic font-bold text-lg uppercase tracking-widest">Sem registros de giro físico.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
