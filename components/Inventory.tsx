
import React, { useState, useMemo, useRef } from 'react';
import { Material, StockMovement } from '../types';
import * as XLSX from 'xlsx';

interface Props {
  materials: Material[];
  movements: StockMovement[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  onAddMovement: (mov: StockMovement) => void;
}

const Inventory: React.FC<Props> = ({ materials, movements, setMaterials, onAddMovement }) => {
  const [view, setView] = useState<'stock' | 'history'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para criação de novo material
  const [showModal, setShowModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    status: 'ACTIVE',
    minStock: 10,
    currentStock: 0,
    unitCost: 0,
    group: 'Geral',
    unit: 'Un'
  });

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

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.code || !newMaterial.description) return;

    const id = Math.random().toString(36).substr(2, 9);
    const material: Material = {
        id,
        code: newMaterial.code,
        description: newMaterial.description,
        group: newMaterial.group || 'Geral',
        unit: newMaterial.unit || 'Un',
        unitCost: Number(newMaterial.unitCost) || 0,
        minStock: Number(newMaterial.minStock) || 0,
        currentStock: Number(newMaterial.currentStock) || 0,
        location: newMaterial.location || '',
        status: 'ACTIVE'
    };

    setMaterials(prev => [...prev, material]);

    // Se houver estoque inicial, gera movimentação de entrada
    if (material.currentStock > 0) {
        onAddMovement({
            id: Math.random().toString(36).substr(2, 9),
            type: 'IN',
            materialId: id,
            quantity: material.currentStock,
            date: new Date().toISOString(),
            userId: 'ADMIN',
            description: 'Saldo Inicial (Cadastro Manual)'
        });
    }

    setShowModal(false);
    setNewMaterial({ status: 'ACTIVE', minStock: 10, currentStock: 0, unitCost: 0, group: 'Geral', unit: 'Un' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      /* Esperado: Codigo, Descricao, Grupo, Unidade, Custo, Estoque, Minimo */
      const importedMaterials: Material[] = [];
      
      data.forEach((row: any) => {
        const code = row['Codigo'] || row['SKU'] || row['Code'];
        const desc = row['Descricao'] || row['Description'];
        
        if (code && desc) {
            // Verifica se já existe
            if (materials.some(m => m.code === code)) return;

            const newMat: Material = {
                id: Math.random().toString(36).substr(2, 9),
                code: String(code),
                description: String(desc),
                group: row['Grupo'] || 'Geral',
                unit: row['Unidade'] || 'Un',
                unitCost: Number(row['Custo']) || 0,
                minStock: Number(row['Minimo']) || 10,
                currentStock: Number(row['Estoque']) || 0,
                location: row['Local'] || '',
                status: 'ACTIVE'
            };
            importedMaterials.push(newMat);

            // Gerar movimento inicial se tiver estoque
            if (newMat.currentStock > 0) {
                onAddMovement({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'IN',
                    materialId: newMat.id,
                    quantity: newMat.currentStock,
                    date: new Date().toISOString(),
                    userId: 'ADMIN',
                    description: 'Importação via Planilha'
                });
            }
        }
      });

      if (importedMaterials.length > 0) {
          setMaterials(prev => [...prev, ...importedMaterials]);
          alert(`${importedMaterials.length} itens importados com sucesso!`);
      } else {
          alert('Nenhum item novo encontrado ou formato inválido. Use colunas: Codigo, Descricao, Grupo, Unidade, Custo, Estoque');
      }
      
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const filteredMaterials = materials.filter(m => m.description.toLowerCase().includes(searchTerm.toLowerCase()) || m.code.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Almoxarifado Central</h2>
          <p className="text-slate-500 text-lg mt-1 font-medium">Controle físico de estoque e auditoria.</p>
        </div>
        <div className="flex flex-wrap gap-3">
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button onClick={() => setView('stock')} className={`px-6 py-3 rounded-lg text-sm font-bold uppercase transition-all ${view === 'stock' ? 'bg-white text-slate-800 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Saldo Atual</button>
                <button onClick={() => setView('history')} className={`px-6 py-3 rounded-lg text-sm font-bold uppercase transition-all ${view === 'history' ? 'bg-white text-slate-800 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Kardex</button>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all h-[52px]">
                <i className="fas fa-file-excel"></i> Importar
            </button>

            <button onClick={() => setShowModal(true)} className="bg-clean-primary text-white px-6 py-3 rounded-xl font-bold text-sm uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2 transition-all h-[52px]">
                <i className="fas fa-plus"></i> Novo Item
            </button>
        </div>
      </header>

      {view === 'stock' ? (
        <>
          <div className="relative max-w-lg">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
            <input type="text" placeholder="Filtrar materiais por nome ou código..." className="w-full pl-12 pr-4 h-14 bg-white border border-slate-300 rounded-xl text-lg text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary placeholder:text-slate-400 font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                      <th className="px-8 py-5 text-right">Valor Unit.</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5 text-center">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredMaterials.map(m => (
                       <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-8 py-5 font-mono text-base text-slate-500 font-bold">{m.code}</td>
                           <td className="px-8 py-5 font-bold text-slate-800">{m.description}</td>
                           <td className="px-8 py-5 text-slate-500 font-medium">{m.group}</td>
                           <td className="px-8 py-5 text-right text-slate-400 font-medium">{m.minStock}</td>
                           <td className="px-8 py-5 text-right font-black text-slate-800 text-xl">{m.currentStock} <span className="text-xs text-slate-400 font-bold uppercase ml-1">{m.unit}</span></td>
                           <td className="px-8 py-5 text-right font-medium text-slate-600">R$ {formatCurrency(m.unitCost)}</td>
                           <td className="px-8 py-5 text-center">
                               {m.currentStock <= m.minStock ? (
                                   <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide border border-red-200">Repor</span>
                               ) : (
                                   <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide border border-emerald-200">OK</span>
                               )}
                           </td>
                           <td className="px-8 py-5 text-center">
                               <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { const q = prompt("Qtd Entrada:"); if(q) handleManualAdjustment(m.id, 'IN', Number(q), 'Entrada Manual'); }} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 border border-slate-200 rounded-lg transition-all shadow-sm" title="Entrada"><i className="fas fa-plus"></i></button>
                                   <button onClick={() => { const q = prompt("Qtd Saída:"); if(q) handleManualAdjustment(m.id, 'OUT', Number(q), 'Baixa Manual'); }} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 border border-slate-200 rounded-lg transition-all shadow-sm" title="Saída"><i className="fas fa-minus"></i></button>
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
               <table className="w-full text-base text-left">
                   <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider"><tr className="border-b border-slate-200"><th className="p-5">Data</th><th className="p-5">Tipo</th><th className="p-5">Material</th><th className="p-5 text-right">Qtd</th><th className="p-5">Origem / Justificativa</th></tr></thead>
                   <tbody className="divide-y divide-slate-100">
                       {movements.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(mov => (
                           <tr key={mov.id} className="hover:bg-slate-50">
                               <td className="p-5 text-slate-500 font-mono font-medium">{new Date(mov.date).toLocaleString()}</td>
                               <td className="p-5"><span className={`font-black text-xs px-3 py-1.5 rounded-lg border uppercase tracking-wide ${mov.type==='IN'?'bg-emerald-50 text-emerald-700 border-emerald-200':mov.type==='OUT'?'bg-amber-50 text-amber-700 border-amber-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>{mov.type}</span></td>
                               <td className="p-5 font-bold text-slate-700">{materials.find(m=>m.id===mov.materialId)?.description || '---'}</td>
                               <td className="p-5 text-right font-mono font-bold text-lg">{mov.quantity}</td>
                               <td className="p-5 text-slate-500 font-medium">{mov.description}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-slate-900">Novo Item de Estoque</h3>
                    <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"><i className="fas fa-times text-lg"></i></button>
                </div>
                <form onSubmit={handleCreateMaterial} className="p-8 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Código (SKU)</label>
                            <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20 uppercase" placeholder="EX: MAT-001" value={newMaterial.code} onChange={e => setNewMaterial({...newMaterial, code: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Grupo / Categoria</label>
                            <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" placeholder="Ex: Elétrica" value={newMaterial.group} onChange={e => setNewMaterial({...newMaterial, group: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-800 mb-2 block">Descrição Completa</label>
                        <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" placeholder="Ex: Cabo Flexível 2.5mm Preto" value={newMaterial.description} onChange={e => setNewMaterial({...newMaterial, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Unidade</label>
                            <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" placeholder="Un, Kg, M" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Custo Unit. (R$)</label>
                            <input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newMaterial.unitCost} onChange={e => setNewMaterial({...newMaterial, unitCost: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Localização</label>
                            <input className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" placeholder="Corredor A" value={newMaterial.location} onChange={e => setNewMaterial({...newMaterial, location: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Estoque Mínimo</label>
                            <input type="number" min="0" required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newMaterial.minStock} onChange={e => setNewMaterial({...newMaterial, minStock: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-800 mb-2 block">Estoque Inicial</label>
                            <input type="number" min="0" required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-2 focus:ring-clean-primary/20" value={newMaterial.currentStock} onChange={e => setNewMaterial({...newMaterial, currentStock: Number(e.target.value)})} />
                            <p className="text-xs text-slate-500 mt-1">Será gerado um registro de entrada.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-base font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" className="px-8 py-3 text-base font-bold text-white bg-clean-primary hover:bg-clean-primary/90 rounded-lg shadow-lg shadow-clean-primary/30 transition-all transform hover:-translate-y-0.5">Cadastrar Material</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
