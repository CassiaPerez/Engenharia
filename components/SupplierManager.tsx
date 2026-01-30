
import React, { useState, useRef } from 'react';
import { Supplier, PurchaseRecord, Material, SupplierDoc, User } from '../types';
import { supabase } from '../services/supabase';

interface Props {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: PurchaseRecord[];
  materials: Material[];
  currentUser: User;
}

const SupplierManager: React.FC<Props> = ({ suppliers, setSuppliers, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({ rating: 5, categoryIds: [], status: 'PENDING', docs: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNewSupplier = () => {
      // Limpeza completa do formulário ao abrir
      setFormData({ 
          rating: 5, 
          categoryIds: [], 
          status: 'PENDING', 
          docs: [],
          name: '',
          document: '',
          email: '',
          phone: '',
          address: '',
          notes: ''
      });
      setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuppliers(prev => [...prev, { 
        id: Math.random().toString(36).substr(2, 9), 
        name: formData.name || '', 
        document: formData.document || '', 
        email: formData.email || '', 
        phone: formData.phone || '', 
        address: formData.address || '', 
        rating: formData.rating || 5, 
        notes: formData.notes || '', 
        categoryIds: [],
        status: formData.status || 'PENDING',
        docs: formData.docs || []
    }]);
    setShowModal(false); setFormData({ rating: 5, status: 'PENDING', docs: [] });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const newDoc: SupplierDoc = {
              name: file.name,
              url: evt.target?.result as string,
              type: file.type,
              uploadDate: new Date().toISOString()
          };
          setFormData(prev => ({ ...prev, docs: [...(prev.docs || []), newDoc] }));
      };
      reader.readAsDataURL(file);
  };

  const removeDoc = (index: number) => {
      setFormData(prev => ({ ...prev, docs: prev.docs?.filter((_, i) => i !== index) }));
  };

  const handleDelete = async (id: string) => {
      if (currentUser.role !== 'ADMIN') {
          alert('Apenas administradores podem excluir fornecedores.');
          return;
      }

      if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
          setSuppliers(prev => prev.filter(s => s.id !== id));
          try {
              const { error } = await supabase.from('suppliers').delete().eq('id', id);
              if (error) throw error;
          } catch (e) {
              console.error('Erro ao excluir:', e);
              alert('Erro ao excluir do Supabase. Verifique se o script de banco de dados (Documentação) foi executado corretamente.');
          }
      }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div><h2 className="text-3xl font-bold text-slate-800 tracking-tight">Fornecedores</h2><p className="text-slate-500 text-base mt-1">Base de parceiros homologados.</p></div>
        <button onClick={openNewSupplier} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2"><i className="fas fa-plus"></i> Novo Fornecedor</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(sup => (
          <div key={sup.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-clean-primary hover:shadow-lg transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-slate-800 truncate">{sup.name}</h3>
              <div className="flex flex-col items-end gap-1">
                 <div className="text-xs text-yellow-400 bg-yellow-50 px-2 py-1 rounded border border-yellow-100">{Array(sup.rating).fill(0).map((_,i)=><i key={i} className="fas fa-star"></i>)}</div>
                 <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${sup.status === 'HOMOLOGATED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {sup.status === 'HOMOLOGATED' ? 'Homologado' : 'Pendente'}
                 </span>
              </div>
            </div>
            <div className="text-sm text-slate-600 space-y-2.5">
               <p className="flex items-center gap-2"><i className="fas fa-id-card w-4 text-slate-400"></i> {sup.document}</p>
               <p className="flex items-center gap-2"><i className="fas fa-envelope w-4 text-slate-400"></i> {sup.email}</p>
               <p className="flex items-center gap-2"><i className="fas fa-phone w-4 text-slate-400"></i> {sup.phone}</p>
               {sup.docs && sup.docs.length > 0 && (
                   <p className="flex items-center gap-2 text-clean-primary font-bold cursor-pointer hover:underline"><i className="fas fa-paperclip w-4"></i> {sup.docs.length} documentos anexados</p>
               )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                <button className="flex-1 h-10 bg-slate-50 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors">Ver Detalhes</button>
            </div>
            
            {currentUser.role === 'ADMIN' && (
               <button onClick={() => handleDelete(sup.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-red-200 text-red-500 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 shadow-sm" title="Excluir">
                   <i className="fas fa-trash text-xs"></i>
               </button>
            )}
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h3 className="font-bold text-xl text-slate-800">Novo Fornecedor</h3>
                    <p className="text-sm text-slate-500 mt-1">Cadastro de parceiro comercial.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                <form id="supplierForm" onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Razão Social</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 transition-all" value={formData.name || ''} onChange={e=>setFormData({...formData, name:e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">CNPJ</label><input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 transition-all" value={formData.document || ''} onChange={e=>setFormData({...formData, document:e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email</label><input type="email" className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 transition-all" value={formData.email || ''} onChange={e=>setFormData({...formData, email:e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Telefone</label><input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 transition-all" value={formData.phone || ''} onChange={e=>setFormData({...formData, phone:e.target.value})} /></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Status</label><select className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 transition-all" value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})}><option value="PENDING">Pendente</option><option value="HOMOLOGATED">Homologado</option><option value="BLOCKED">Bloqueado</option></select></div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2"><label className="text-xs font-bold text-slate-500 uppercase">Documentos</label><button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-clean-primary font-bold hover:underline bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">+ Add</button><input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" /></div>
                        <div className="space-y-2">{formData.docs?.map((doc, i) => (<div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100"><div className="flex items-center gap-3"><span className="text-sm font-bold text-slate-700 truncate">{doc.name}</span></div><button type="button" onClick={() => removeDoc(i)} className="text-slate-400 hover:text-red-500"><i className="fas fa-trash"></i></button></div>))}</div>
                    </div>
                </form>
            </div>
            <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10"><button type="button" onClick={()=>setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button><button type="submit" form="supplierForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg transition-all">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManager;
