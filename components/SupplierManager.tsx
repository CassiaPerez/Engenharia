
import React, { useState } from 'react';
import { Supplier, PurchaseRecord, Material } from '../types';

interface Props {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: PurchaseRecord[];
  materials: Material[];
}

const SupplierManager: React.FC<Props> = ({ suppliers, setSuppliers }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({ rating: 5, categoryIds: [] });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuppliers(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: formData.name || '', document: formData.document || '', email: formData.email || '', phone: formData.phone || '', address: formData.address || '', rating: formData.rating || 5, notes: formData.notes || '', categoryIds: [] }]);
    setShowModal(false); setFormData({ rating: 5 });
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Fornecedores</h2><p className="text-slate-500 text-base mt-1">Base de parceiros homologados.</p></div>
        <button onClick={() => setShowModal(true)} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2"><i className="fas fa-plus"></i> Novo Fornecedor</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(sup => (
          <div key={sup.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-clean-primary hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-slate-800 truncate">{sup.name}</h3>
              <div className="text-xs text-yellow-400 bg-yellow-50 px-2 py-1 rounded border border-yellow-100">{Array(sup.rating).fill(0).map((_,i)=><i key={i} className="fas fa-star"></i>)}</div>
            </div>
            <div className="text-sm text-slate-600 space-y-2.5">
               <p className="flex items-center gap-2"><i className="fas fa-id-card w-4 text-slate-400"></i> {sup.document}</p>
               <p className="flex items-center gap-2"><i className="fas fa-envelope w-4 text-slate-400"></i> {sup.email}</p>
               <p className="flex items-center gap-2"><i className="fas fa-phone w-4 text-slate-400"></i> {sup.phone}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                <button className="flex-1 h-10 bg-slate-50 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors">Ver Detalhes</button>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-bold text-2xl mb-6 text-slate-800">Novo Fornecedor</h3>
            <form onSubmit={handleSave} className="space-y-5">
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Razão Social / Nome</label>
                    <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, name:e.target.value})} />
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">CNPJ / Documento</label>
                    <input required className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, document:e.target.value})} />
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Email Corporativo</label>
                    <input type="email" className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, email:e.target.value})} />
                </div>
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Telefone</label>
                    <input className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg text-base text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary" onChange={e=>setFormData({...formData, phone:e.target.value})} />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 mt-2">
                    <button type="button" onClick={()=>setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-lg text-base font-bold transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-clean-primary text-white rounded-lg text-base font-bold hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transform hover:-translate-y-0.5 transition-all">Salvar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
