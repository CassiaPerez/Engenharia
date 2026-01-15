
import React, { useState } from 'react';
import { Supplier, PurchaseRecord, Material } from '../types';

interface Props {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: PurchaseRecord[];
  materials: Material[];
}

const SupplierManager: React.FC<Props> = ({ suppliers, setSuppliers, purchases, materials }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({ rating: 5, categoryIds: [] });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupplier) {
      setSuppliers(prev => prev.map(s => s.id === selectedSupplier.id ? { ...s, ...formData } as Supplier : s));
    } else {
      const newSup: Supplier = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name || '',
        document: formData.document || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        rating: formData.rating || 5,
        notes: formData.notes || '',
        categoryIds: []
      };
      setSuppliers([...suppliers, newSup]);
    }
    setShowModal(false);
    setSelectedSupplier(null);
    setFormData({ rating: 5 });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <i key={i} className={`fas fa-star ${i < rating ? 'text-yellow-400' : 'text-slate-200'}`}></i>
    ));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Suprimentos</h2>
          <p className="text-slate-500 text-sm font-medium">Qualificação de parceiros e histórico de compras</p>
        </div>
        <button 
          onClick={() => { setSelectedSupplier(null); setFormData({rating: 5}); setShowModal(true); }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 text-sm"
        >
          <i className="fas fa-user-plus"></i> Novo Fornecedor
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(sup => (
          <div key={sup.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all hover:border-blue-100">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 truncate tracking-tight">{sup.name}</h3>
              <div className="text-[10px] flex gap-0.5">{renderStars(sup.rating)}</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-500 font-bold space-y-2 uppercase tracking-tight">
                <p className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl"><i className="fas fa-id-card text-blue-500"></i> {sup.document}</p>
                <p className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl"><i className="fas fa-envelope text-blue-500"></i> {sup.email}</p>
                <p className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl"><i className="fas fa-phone text-blue-500"></i> {sup.phone}</p>
              </div>
              <div className="pt-2 flex gap-2">
                <button 
                  onClick={() => { setSelectedSupplier(sup); setFormData(sup); setShowModal(true); }}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors"
                >Editar</button>
                <button 
                  className="flex-1 py-2.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-100 transition-colors"
                >Compras</button>
              </div>
            </div>
          </div>
        ))}

        {suppliers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <i className="fas fa-truck-ramp-box text-5xl text-slate-200 mb-4"></i>
            <p className="text-slate-500 font-bold">Nenhum fornecedor qualificado.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
            <form onSubmit={handleSave}>
              <div className="p-8 md:p-10 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{selectedSupplier ? 'Editar Parceiro' : 'Qualificar Fornecedor'}</h3>
                <button type="button" onClick={() => { setShowModal(false); setSelectedSupplier(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><i className="fas fa-times text-2xl"></i></button>
              </div>
              <div className="p-8 md:p-10 grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Razão Social / Nome Fantasia</label>
                  <input 
                    type="text" required value={formData.name || ''}
                    placeholder="Nome completo da empresa"
                    className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">CNPJ / CPF</label>
                  <input 
                    type="text" required value={formData.document || ''}
                    placeholder="Documento oficial"
                    className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    onChange={e => setFormData({...formData, document: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Rating Qualificação</label>
                  <select 
                    className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700" 
                    value={formData.rating}
                    onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
                  >
                    {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Estrelas</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">E-mail Comercial</label>
                  <input 
                    type="email" value={formData.email || ''}
                    placeholder="vendas@empresa.com"
                    className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" value={formData.phone || ''}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Endereço Logístico</label>
                  <input 
                    type="text" value={formData.address || ''}
                    placeholder="Logradouro, número, bairro..."
                    className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Observações de Auditoria</label>
                  <textarea 
                    className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 h-24 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-600 text-sm" 
                    value={formData.notes || ''}
                    placeholder="Histórico de entregas, acordos comerciais..."
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>
              <div className="p-10 bg-slate-50 flex justify-end gap-5">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setSelectedSupplier(null); }}
                  className="px-8 py-4 text-slate-500 font-black text-xs uppercase hover:bg-slate-100 rounded-2xl transition-all tracking-widest"
                >Cancelar</button>
                <button 
                  type="submit" 
                  className="px-12 py-4 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all tracking-widest"
                >Salvar Parceiro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
