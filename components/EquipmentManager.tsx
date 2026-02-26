import React, { useState, useMemo } from 'react';
import { Equipment, User, OS, CompanyName } from '../types';
import { supabase, mapToSupabase } from '../services/supabase';

interface EquipmentManagerProps {
  equipments: Equipment[];
  setEquipments: React.Dispatch<React.SetStateAction<Equipment[]>>;
  currentUser: User;
  oss?: OS[];  // ✅ NOVO: para calcular custo acumulado na Árvore de Bens
}

const COMPANIES: CompanyName[] = [
  'Cropbio',
  'Cropfert Industria',
  'Cropfert Jandaia',
  'Cropfert do Brasil',
];

const EMPTY_FORM: Partial<Equipment> = {
  code: '', name: '', description: '', location: '',
  model: '', serialNumber: '', manufacturer: '',
  status: 'ACTIVE', notes: '', purchaseDate: '',
  company: undefined, sector: '', buildingId: undefined,
};

const STATUS_CFG: Record<string, { label: string; color: string; icon: string; dot: string }> = {
  ACTIVE:      { label: 'Ativo',      color: 'bg-green-100 text-green-700',  icon: 'fa-check-circle', dot: 'bg-green-500' },
  MAINTENANCE: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700',  icon: 'fa-tools',        dot: 'bg-amber-500' },
  INACTIVE:    { label: 'Inativo',    color: 'bg-red-100 text-red-700',      icon: 'fa-times-circle', dot: 'bg-red-400'   },
};

const EquipmentManager: React.FC<EquipmentManagerProps> = ({
  equipments, setEquipments, currentUser, oss = []
}) => {
  const [view, setView] = useState<'list' | 'tree'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Equipment>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const canEdit = ['ADMIN', 'MANAGER', 'COORDINATOR'].includes(currentUser.role);

  const setField = (k: keyof Equipment, v: any) => setForm(p => ({ ...p, [k]: v }));

  // ✅ Custo acumulado por equipamento (via OS vinculadas)
  const costByEq = useMemo(() => {
    const map: Record<string, { total: number; osCount: number }> = {};
    oss.forEach(o => {
      if (!o.equipmentId) return;
      const matCost = o.materials.reduce((s, m) => s + m.quantity * m.unitCost, 0);
      const svcCost = o.services.reduce((s, sv) => s + sv.quantity * sv.unitCost, 0);
      const cost = matCost + svcCost + (o.manualMaterialCost || 0) + (o.manualServiceCost || 0);
      if (!map[o.equipmentId]) map[o.equipmentId] = { total: 0, osCount: 0 };
      map[o.equipmentId].total   += cost;
      map[o.equipmentId].osCount += 1;
    });
    return map;
  }, [oss]);

  // Filtro para lista
  const filteredEqs = useMemo(() => {
    const q = search.toLowerCase();
    return equipments.filter(eq => {
      const matchSearch = !q || [eq.name, eq.code, eq.description, eq.manufacturer, eq.model, eq.location, eq.company, eq.sector]
        .some(f => f?.toLowerCase().includes(q));
      const matchCompany = !filterCompany || eq.company === filterCompany;
      const matchStatus  = !filterStatus  || eq.status  === filterStatus;
      return matchSearch && matchCompany && matchStatus;
    });
  }, [equipments, search, filterCompany, filterStatus]);

  // ✅ Árvore de bens: Empresa → Setor → Equipamentos
  const assetTree = useMemo(() => {
    const tree: Record<string, Record<string, Equipment[]>> = {};
    equipments.forEach(eq => {
      const company = eq.company || 'Sem empresa';
      const sector  = eq.sector  || 'Sem setor';
      if (!tree[company]) tree[company] = {};
      if (!tree[company][sector]) tree[company][sector] = [];
      tree[company][sector].push(eq);
    });
    return tree;
  }, [equipments]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const handleSave = async () => {
    if (!form.code?.trim() || !form.name?.trim()) {
      alert('TAG (código) e nome são obrigatórios.');
      return;
    }
    setSaving(true);
    const eq: Equipment = {
      id: editingId || `EQP-${Date.now()}`,
      code: form.code!,
      name: form.name!,
      description: form.description || '',
      location: form.location || '',
      model: form.model || '',
      serialNumber: form.serialNumber || '',
      manufacturer: form.manufacturer || '',
      status: (form.status as Equipment['status']) || 'ACTIVE',
      notes: form.notes || '',
      purchaseDate: form.purchaseDate,
      company: form.company as CompanyName | undefined,
      sector: form.sector || undefined,
      buildingId: form.buildingId,
    };

    try {
      if (editingId) {
        setEquipments(prev => prev.map(e => e.id === editingId ? eq : e));
      } else {
        setEquipments(prev => [...prev, eq]);
      }
      const { error } = await supabase.from('equipments').upsert(mapToSupabase(eq));
      if (error) throw error;
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM);
    } catch (err) {
      console.error('Erro ao salvar equipamento:', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (eq: Equipment) => {
    setEditingId(eq.id);
    setForm({ ...eq });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmar exclusão do equipamento?')) return;
    setEquipments(prev => prev.filter(e => e.id !== id));
    await supabase.from('equipments').delete().eq('id', id);
  };

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipamentos</h1>
          <p className="text-slate-500 text-sm">{equipments.length} equipamentos cadastrados</p>
        </div>
        <div className="flex gap-2">
          {/* Toggle lista / árvore */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <i className="fas fa-list mr-1.5"></i>Lista
            </button>
            <button onClick={() => setView('tree')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${view === 'tree' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <i className="fas fa-sitemap mr-1.5"></i>Árvore de Bens
            </button>
          </div>
          {canEdit && (
            <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
              <i className="fas fa-plus mr-1.5"></i>Novo Equipamento
            </button>
          )}
        </div>
      </div>

      {/* ===== VISTA LISTA ===== */}
      {view === 'list' && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-52 relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input type="text" placeholder="Buscar por nome, TAG, fabricante, empresa..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
              <option value="">Todas as empresas</option>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Sem empresa">Sem empresa</option>
            </select>
            <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="MAINTENANCE">Manutenção</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          {/* Grid de cards */}
          {filteredEqs.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-cogs text-5xl mb-3 block"></i>
              <p className="font-semibold">Nenhum equipamento encontrado</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEqs.map(eq => {
              const st = STATUS_CFG[eq.status] || STATUS_CFG.ACTIVE;
              const costs = costByEq[eq.id];
              return (
                <div key={eq.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    {/* TAG + Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{eq.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
                            <i className={`fas ${st.icon} mr-1 text-[10px]`}></i>{st.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 truncate">{eq.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{eq.description}</p>
                      </div>
                    </div>

                    {/* Campos */}
                    <div className="space-y-1 text-xs text-slate-600 mt-2">
                      <div className="flex gap-1.5">
                        <i className="fas fa-industry text-slate-300 w-3.5 mt-0.5 shrink-0"></i>
                        <span className="truncate">{eq.manufacturer}{eq.model ? ` — ${eq.model}` : ''}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <i className="fas fa-map-marker-alt text-slate-300 w-3.5 mt-0.5 shrink-0"></i>
                        <span className="truncate">{eq.location || '—'}</span>
                      </div>
                      {/* ✅ NOVO: empresa e setor */}
                      {eq.company && (
                        <div className="flex gap-1.5">
                          <i className="fas fa-building text-blue-400 w-3.5 mt-0.5 shrink-0"></i>
                          <span className="font-semibold text-blue-700 truncate">{eq.company}</span>
                        </div>
                      )}
                      {eq.sector && (
                        <div className="flex gap-1.5">
                          <i className="fas fa-layer-group text-slate-300 w-3.5 mt-0.5 shrink-0"></i>
                          <span className="truncate">{eq.sector}</span>
                        </div>
                      )}
                    </div>

                    {/* Custo acumulado */}
                    {costs && (
                      <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2 flex justify-between text-xs border border-slate-100">
                        <span className="text-slate-500">{costs.osCount} OS vinculada(s)</span>
                        <span className="font-bold text-slate-800">{fmt(costs.total)}</span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  {canEdit && (
                    <div className="px-4 pb-3 flex gap-2 border-t border-slate-50 pt-3">
                      <button onClick={() => handleEdit(eq)}
                        className="flex-1 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                        <i className="fas fa-pencil mr-1"></i>Editar
                      </button>
                      <button onClick={() => handleDelete(eq.id)}
                        className="py-1.5 px-3 text-xs font-semibold border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== VISTA ÁRVORE DE BENS ===== */}
      {view === 'tree' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <i className="fas fa-info-circle mr-2"></i>
            A Árvore de Bens organiza os equipamentos por <strong>empresa</strong> e <strong>setor</strong>.
            Edite os equipamentos e preencha os campos "Empresa" e "Setor" para populá-la.
          </div>

          {Object.keys(assetTree).length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-sitemap text-5xl mb-3 block"></i>
              <p className="font-semibold">Nenhum equipamento vinculado a empresa</p>
              <p className="text-sm mt-1">Edite equipamentos e preencha o campo "Empresa"</p>
            </div>
          )}

          {Object.entries(assetTree).map(([company, sectors]) => {
            const allEqs    = Object.values(sectors).flat();
            const totalCost = allEqs.reduce((s, eq) => s + (costByEq[eq.id]?.total || 0), 0);
            const isReal    = COMPANIES.includes(company as CompanyName);

            return (
              <div key={company} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">

                {/* Nível: EMPRESA */}
                <div className={`flex items-center justify-between px-5 py-4 ${isReal ? 'bg-[#001529]' : 'bg-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isReal ? 'bg-blue-600' : 'bg-slate-400'}`}>
                      <i className="fas fa-building text-white"></i>
                    </div>
                    <div>
                      <p className={`font-bold text-base ${isReal ? 'text-white' : 'text-slate-700'}`}>{company}</p>
                      <p className={`text-xs ${isReal ? 'text-blue-300' : 'text-slate-500'}`}>
                        {allEqs.length} equipamento(s) · {Object.keys(sectors).length} setor(es)
                      </p>
                    </div>
                  </div>
                  {totalCost > 0 && (
                    <div className="text-right">
                      <p className={`text-xs ${isReal ? 'text-blue-300' : 'text-slate-400'}`}>Custo acumulado</p>
                      <p className={`font-black text-lg ${isReal ? 'text-white' : 'text-slate-700'}`}>{fmt(totalCost)}</p>
                    </div>
                  )}
                </div>

                {/* Nível: SETORES */}
                <div className="divide-y divide-slate-100">
                  {Object.entries(sectors).map(([sector, eqs]) => {
                    const sectorCost = eqs.reduce((s, eq) => s + (costByEq[eq.id]?.total || 0), 0);
                    return (
                      <details key={sector} className="group">
                        <summary className="flex items-center gap-3 px-5 py-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors list-none select-none">
                          <i className="fas fa-chevron-right text-blue-400 text-xs group-open:rotate-90 transition-transform"></i>
                          <i className="fas fa-layer-group text-blue-400 text-sm"></i>
                          <span className="font-semibold text-blue-900 flex-1 text-sm">{sector}</span>
                          <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full font-bold">{eqs.length}</span>
                          {sectorCost > 0 && (
                            <span className="text-xs font-bold text-blue-700">{fmt(sectorCost)}</span>
                          )}
                        </summary>

                        {/* Nível: EQUIPAMENTOS */}
                        <div className="divide-y divide-slate-50">
                          {eqs.map(eq => {
                            const st    = STATUS_CFG[eq.status] || STATUS_CFG.ACTIVE;
                            const costs = costByEq[eq.id];
                            return (
                              <div key={eq.id} className="flex items-center gap-3 px-6 sm:px-10 py-3 hover:bg-slate-50 transition-colors">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`}></span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{eq.code}</span>
                                    <span className="font-semibold text-slate-800 text-sm truncate">{eq.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${st.color}`}>{st.label}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                                    {eq.manufacturer}{eq.model ? ` · ${eq.model}` : ''}{eq.location ? ` · ${eq.location}` : ''}
                                  </p>
                                </div>
                                {costs && (
                                  <div className="text-right shrink-0">
                                    <p className="text-[10px] text-slate-400">{costs.osCount} OS</p>
                                    <p className="text-xs font-bold text-slate-700">{fmt(costs.total)}</p>
                                  </div>
                                )}
                                {canEdit && (
                                  <button onClick={() => handleEdit(eq)}
                                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all text-xs">
                                    <i className="fas fa-pencil"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODAL DE FORMULÁRIO ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">
            <div className="bg-[#001529] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fas fa-cogs"></i>
                {editingId ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="text-white/70 hover:text-white text-xl">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="TAG / Código *" value={form.code || ''} onChange={v => setField('code', v)} placeholder="Ex: COM-01" />
                <Field label="Nome do Equipamento *" value={form.name || ''} onChange={v => setField('name', v)} placeholder="Ex: Compressor Parafuso" />
              </div>
              <Field label="Descrição" value={form.description || ''} onChange={v => setField('description', v)} placeholder="Descrição detalhada do equipamento" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Fabricante" value={form.manufacturer || ''} onChange={v => setField('manufacturer', v)} placeholder="Ex: Atlas Copco" />
                <Field label="Modelo" value={form.model || ''} onChange={v => setField('model', v)} placeholder="Ex: GA-30" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Número de Série" value={form.serialNumber || ''} onChange={v => setField('serialNumber', v)} placeholder="Ex: AIF-998877" />
                <Field label="Local Físico" value={form.location || ''} onChange={v => setField('location', v)} placeholder="Ex: Sala de Máquinas" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    value={form.status || 'ACTIVE'} onChange={e => setField('status', e.target.value)}>
                    <option value="ACTIVE">Ativo</option>
                    <option value="MAINTENANCE">Em Manutenção</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>
                <Field label="Data de Aquisição" value={form.purchaseDate || ''} onChange={v => setField('purchaseDate', v)} type="date" />
              </div>

              {/* ✅ NOVO: Campos para Árvore de Bens */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                  <i className="fas fa-sitemap mr-1.5"></i>Árvore de Bens
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Empresa</label>
                    <select className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      value={form.company || ''} onChange={e => setField('company', e.target.value || undefined)}>
                      <option value="">Não vinculado</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <Field label="Setor" value={form.sector || ''} onChange={v => setField('sector', v)} placeholder="Ex: Produção, Laboratório, Manutenção..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações</label>
                <textarea rows={3} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Notas de manutenção, periodicidade de revisão, etc..."
                  value={form.notes || ''} onChange={e => setField('notes', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6 border-t border-slate-100 pt-4">
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
                {saving ? <><i className="fas fa-spinner fa-spin mr-1.5"></i>Salvando...</> : <><i className="fas fa-save mr-1.5"></i>{editingId ? 'Atualizar' : 'Cadastrar'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente auxiliar de campo de texto
const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
    <input
      type={type}
      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

export default EquipmentManager;