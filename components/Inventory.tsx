import React, { useMemo, useState } from 'react';
import { supabase, mapToSupabase } from '../services/supabase';
import { Material, StockMovement, User } from '../types';
import ModalPortal from './ModalPortal';

type Props = {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  movements: StockMovement[];
  setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  currentUser: User;
};

const formatCurrency = (val: number) =>
  (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseBRL = (v: string) => {
  const n = Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const InventoryManager: React.FC<Props> = ({ materials, setMaterials, movements, setMovements, currentUser }) => {
  const [search, setSearch] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');

  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);

  // Entrada
  const [inQty, setInQty] = useState<number>(1);
  const [inUnitCost, setInUnitCost] = useState<string>('');
  const [inDesc, setInDesc] = useState<string>('');

  // Saída
  const [outQty, setOutQty] = useState<number>(1);
  const [outDesc, setOutDesc] = useState<string>('');

  const selectedMaterial = useMemo(
    () => materials.find(m => m.id === selectedMaterialId) || null,
    [materials, selectedMaterialId]
  );

  const filteredMaterials = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return materials;
    return materials.filter(m =>
      `${m.code} ${m.description}`.toLowerCase().includes(s)
    );
  }, [materials, search]);

  const openIn = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setInQty(1);
    setInUnitCost('');
    setInDesc('');
    setShowInModal(true);
  };

  const openOut = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setOutQty(1);
    setOutDesc('');
    setShowOutModal(true);
  };

  const reloadMaterialFromDb = async (materialId: string) => {
    // Recarrega o material atualizado (estoque e custo médio após trigger)
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (error) throw error;
    setMaterials(prev => prev.map(m => (m.id === materialId ? data : m)));
    return data as Material;
  };

  const handleSaveIn = async () => {
    if (!selectedMaterial) return;

    const unitCost = parseBRL(inUnitCost);

    if (!inQty || inQty <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      alert('Informe um valor unitário válido.');
      return;
    }

    const payload: Partial<StockMovement> & any = {
      type: 'IN',
      materialId: selectedMaterial.id,
      quantity: inQty,
      unitCost, // 👈 obrigatório para IN
      date: new Date().toISOString(),
      description: inDesc || null,
      userId: currentUser?.id || null,
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(mapToSupabase(payload))
      .select('*')
      .single();

    if (error) {
      console.error(error);
      alert(error.message || 'Erro ao registrar entrada.');
      return;
    }

    setMovements(prev => [data as any, ...prev]);

    try {
      await reloadMaterialFromDb(selectedMaterial.id);
    } catch (e) {
      console.error('Falha ao recarregar material:', e);
    }

    setShowInModal(false);
  };

  const handleSaveOut = async () => {
    if (!selectedMaterial) return;

    if (!outQty || outQty <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    const payload: Partial<StockMovement> & any = {
      type: 'OUT',
      materialId: selectedMaterial.id,
      quantity: outQty,
      date: new Date().toISOString(),
      description: outDesc || null,
      userId: currentUser?.id || null,
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(mapToSupabase(payload))
      .select('*')
      .single();

    if (error) {
      console.error(error);
      alert(error.message || 'Erro ao registrar saída.');
      return;
    }

    setMovements(prev => [data as any, ...prev]);

    try {
      await reloadMaterialFromDb(selectedMaterial.id);
    } catch (e) {
      console.error('Falha ao recarregar material:', e);
    }

    setShowOutModal(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Almoxarifado</h2>
          <p className="text-sm text-slate-500">
            Entradas com valor unitário atualizam o <strong>custo médio</strong> automaticamente.
          </p>
        </div>

        <div className="w-full md:w-96">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código ou descrição..."
            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm"
          />
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 text-xs font-bold text-slate-500 uppercase px-4 py-3 border-b border-slate-200">
          <div className="col-span-2">Código</div>
          <div className="col-span-5">Descrição</div>
          <div className="col-span-1 text-right">Estoque</div>
          <div className="col-span-2 text-right">Custo Médio</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredMaterials.map(mat => (
            <div key={mat.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm">
              <div className="col-span-2 font-mono font-bold text-slate-700">{mat.code}</div>
              <div className="col-span-5 text-slate-800">{mat.description}</div>
              <div className="col-span-1 text-right font-bold text-slate-700">
                {mat.stockQty ?? 0} {mat.unit}
              </div>
              <div className="col-span-2 text-right font-bold text-slate-900">
                R$ {formatCurrency(mat.unitCost ?? 0)}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  onClick={() => openIn(mat.id)}
                  className="h-9 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                >
                  Entrada
                </button>
                <button
                  onClick={() => openOut(mat.id)}
                  className="h-9 px-3 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
                >
                  Saída
                </button>
              </div>
            </div>
          ))}

          {filteredMaterials.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              Nenhum material encontrado.
            </div>
          )}
        </div>
      </div>

      {/* MODAL ENTRADA */}
      {showInModal && selectedMaterial && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000]">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowInModal(false)} />
            <div className="absolute inset-0 p-4 flex items-center justify-center">
              <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Entrada de Material</h3>
                    <p className="text-xs text-slate-500">
                      {selectedMaterial.code} — {selectedMaterial.description}
                    </p>
                  </div>
                  <button
                    className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300"
                    onClick={() => setShowInModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantidade</label>
                      <input
                        type="number"
                        min={0}
                        value={inQty}
                        onChange={(e) => setInQty(Number(e.target.value))}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Valor unitário (R$)
                      </label>
                      <input
                        type="text"
                        value={inUnitCost}
                        onChange={(e) => setInUnitCost(e.target.value)}
                        placeholder="Ex: 12,50"
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição (opcional)</label>
                    <input
                      type="text"
                      value={inDesc}
                      onChange={(e) => setInDesc(e.target.value)}
                      placeholder="Ex: NF 12345 / Lote X"
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    Ao salvar, o sistema recalcula automaticamente o <strong>custo médio</strong> do material.
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
                  <button
                    onClick={() => setShowInModal(false)}
                    className="flex-1 h-11 rounded-xl bg-white border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveIn}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                  >
                    Salvar Entrada
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL SAÍDA */}
      {showOutModal && selectedMaterial && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000]">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowOutModal(false)} />
            <div className="absolute inset-0 p-4 flex items-center justify-center">
              <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Saída de Material</h3>
                    <p className="text-xs text-slate-500">
                      {selectedMaterial.code} — {selectedMaterial.description}
                    </p>
                  </div>
                  <button
                    className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300"
                    onClick={() => setShowOutModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantidade</label>
                    <input
                      type="number"
                      min={0}
                      value={outQty}
                      onChange={(e) => setOutQty(Number(e.target.value))}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição (opcional)</label>
                    <input
                      type="text"
                      value={outDesc}
                      onChange={(e) => setOutDesc(e.target.value)}
                      placeholder="Ex: Retirada para manutenção"
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    A saída <strong>não altera</strong> o custo médio — apenas reduz o saldo.
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
                  <button
                    onClick={() => setShowOutModal(false)}
                    className="flex-1 h-11 rounded-xl bg-white border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveOut}
                    className="flex-1 h-11 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700"
                  >
                    Salvar Saída
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

export default InventoryManager;