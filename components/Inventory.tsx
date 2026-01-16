
import React, { useState, useMemo } from 'react';
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
    if (isNaN(qty) || qty <= 0) return;
    setMaterials(prev => prev.map(m => {
      if (m.id === mId) {
        let newQty = m.currentStock;
        if (type === 'IN' || type === 'RETURN') newQty += qty;
        else if (type === 'OUT' && m.currentStock >= qty) newQty -= qty;
        else if (type === 'ADJUST') newQty = qty;
        else return m; 
        onAddMovement({ id: Math.random().toString(36).substr(2, 9), type, materialId: mId, quantity: qty, date: new Date().toISOString(), userId: 'ADMIN', description: reason });
        return { ...m, currentStock: newQty };
      }
      return m;
    }));
  };

  const filteredMaterials = materials.filter(m => m.description.toLowerCase().includes(searchTerm.toLowerCase()) || m.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Almoxarifado Central</h2>
          <p className="text-slate-500 text-base mt-1">Controle físico de estoque e auditoria.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button onClick={() => setView('stock')} className={`px-6 py-2.5 rounded-lg text-sm font-bold uppercase transition-all ${view === 'stock' ? 'bg-white text-slate-800 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Saldo Atual</button>
          <button onClick={() => setView('history')} className={`px-6 py-2.5 rounded-lg text-sm font-bold uppercase transition-all ${view === 'history' ? 'bg-white text-slate-800 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Kardex</button>
        </div>
      </header>

      {view === 'stock' ? (
        <>
          <div className="relative max-w-lg">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base"></i>
            <input type="text" placeholder="Filtrar materiais por nome ou código..." className="w-full pl-12 pr-4 h-12 bg-white border border-slate-300 rounded-xl text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-base text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs tracking-wider">
                   <tr>
                      <th className="px-8 py-5">Código</th>
                      <th className="px-8 py-5">Descrição</th>
                      <th className="px-8 py-5">Grupo</th>
                      <th className="px-8 py-5 text-right">Mínimo</th>
                      <th className="px-8 py-5 text-right">Saldo</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5 text-center">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredMaterials.map(m => (
                       <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-8 py-5 font-mono text-sm text-slate-500 font-bold">{m.code}</td>
                           <td className="px-8 py-5 font-bold text-slate-800">{m.description}</td>
                           <td className="px-8 py-5 text-slate-500">{m.group}</td>
                           <td className="px-8 py-5 text-right text-slate-400">{m.minStock}</td>
                           <td className="px-8 py-5 text-right font-black text-slate-800 text-lg">{m.currentStock} <span className="text-xs text-slate-400 font-medium ml-1">{m.unit}</span></td>
                           <td className="px-8 py-5 text-center">
                               {m.currentStock <= m.minStock ? (
                                   <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide border border-red-200">Repor</span>
                               ) : (
                                   <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide border border-emerald-200">OK</span>
                               )}
                           </td>
                           <td className="px-8 py-5 text-center">
                               <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { const q = prompt("Qtd Entrada:"); if(q) handleManualAdjustment(m.id, 'IN', Number(q), 'Entrada Manual'); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 border border-slate-200 rounded-lg transition-all" title="Entrada"><i className="fas fa-plus"></i></button>
                                   <button onClick={() => { const q = prompt("Qtd Saída:"); if(q) handleManualAdjustment(m.id, 'OUT', Number(q), 'Baixa Manual'); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 border border-slate-200 rounded-lg transition-all" title="Saída"><i className="fas fa-minus"></i></button>
                               </div>
                           </td>
                       </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
           <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-history text-clean-primary"></i> Histórico de Movimentação (Kardex)</h3>
           <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider"><tr className="border-b border-slate-200"><th className="p-4">Data</th><th className="p-4">Tipo</th><th className="p-4">Material</th><th className="p-4 text-right">Qtd</th><th className="p-4">Origem / Justificativa</th></tr></thead>
                   <tbody className="divide-y divide-slate-100">
                       {movements.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(mov => (
                           <tr key={mov.id} className="hover:bg-slate-50">
                               <td className="p-4 text-slate-500 font-mono">{new Date(mov.date).toLocaleString()}</td>
                               <td className="p-4"><span className={`font-black text-xs px-3 py-1.5 rounded-lg border uppercase tracking-wide ${mov.type==='IN'?'bg-emerald-50 text-emerald-700 border-emerald-200':mov.type==='OUT'?'bg-amber-50 text-amber-700 border-amber-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>{mov.type}</span></td>
                               <td className="p-4 font-bold text-slate-700">{materials.find(m=>m.id===mov.materialId)?.description || '---'}</td>
                               <td className="p-4 text-right font-mono font-bold text-base">{mov.quantity}</td>
                               <td className="p-4 text-slate-500 font-medium">{mov.description}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
