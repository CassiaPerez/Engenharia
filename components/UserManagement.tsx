
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase, mapToSupabase } from '../services/supabase';
import ModalPortal from './ModalPortal';
import PermissionsMatrix from './PermissionsMatrix';
import PermissionsEditor from './PermissionsEditor';

interface Props {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
}

const UserManagement: React.FC<Props> = ({ users, setUsers, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'users' | 'permissions' | 'editor'>('users');
  const [formUser, setFormUser] = useState<Partial<User>>({
    active: true,
    role: 'USER',
    avatar: 'US'
  });
  const [isEditing, setIsEditing] = useState(false);

  const roles: { id: UserRole; label: string; desc: string }[] = [
    { id: 'ADMIN', label: 'Administrador', desc: 'Acesso total ao sistema e configurações.' },
    { id: 'MANAGER', label: 'Gerente', desc: 'Gestão de projetos e relatórios. Sem acesso a usuários.' },
    { id: 'EXECUTOR', label: 'Prestador de Serviço', desc: 'Foco em execução de OS e Agenda.' },
    { id: 'WAREHOUSE', label: 'Almoxarifado (Geral)', desc: 'Supervisão de todos os estoques.' },
    { id: 'WAREHOUSE_BIO', label: 'Almox. CropBio', desc: 'Acesso restrito à unidade Bio.' },
    { id: 'WAREHOUSE_FERT', label: 'Almox. CropFert', desc: 'Acesso restrito à unidade Fert.' },
    { id: 'USER', label: 'Usuário Comum', desc: 'Acesso básico de visualização.' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        let userToSave: User;

        if (isEditing && formUser.id) {
            // Edição
            const existing = users.find(u => u.id === formUser.id);
            if (!existing) throw new Error("Usuário original não encontrado.");
            userToSave = { ...existing, ...formUser } as User;
        } else {
            // Criação
            if (!formUser.name || !formUser.email) {
                alert("Nome e Email são obrigatórios.");
                setLoading(false);
                return;
            }

            // Verifica duplicidade de email
            if (users.some(u => u.email === formUser.email)) {
                alert("Erro: Este e-mail já está cadastrado no sistema.");
                setLoading(false);
                return;
            }

            userToSave = {
                id: Math.random().toString(36).substr(2, 9),
                name: formUser.name,
                email: formUser.email,
                password: formUser.password || '123456',
                role: formUser.role || 'USER',
                department: formUser.department || '',
                active: formUser.active ?? true,
                avatar: formUser.name.substr(0, 2).toUpperCase()
            };
        }

        // 1. Tenta gravar diretamente no Banco de Dados
        const { error } = await supabase.from('users').upsert(mapToSupabase(userToSave));

        if (error) {
            console.error("Erro Supabase:", error);
            throw new Error(error.message || "Falha na comunicação com o banco de dados.");
        }

        // 2. Se deu certo no banco, atualiza a interface local
        if (isEditing) {
            setUsers(prev => prev.map(u => u.id === userToSave.id ? userToSave : u));
        } else {
            setUsers(prev => [...prev, userToSave]);
        }
        
        setShowModal(false);
        setFormUser({ active: true, role: 'USER', avatar: 'US' });
        setIsEditing(false);
        
        // Feedback discreto
        const toast = document.createElement('div');
        toast.className = "fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-[10000] font-bold animate-in slide-in-from-bottom-5";
        toast.innerText = "Usuário salvo com sucesso!";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

    } catch (err: any) {
        alert(`ERRO AO SALVAR USUÁRIO:\n${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (userToDelete: User) => {
      if (userToDelete.id === currentUser.id) {
          alert("Você não pode excluir seu próprio usuário.");
          return;
      }

      if (!confirm(`Tem certeza que deseja excluir o usuário "${userToDelete.name}"? Esta ação não pode ser desfeita.`)) return;

      try {
          const { error } = await supabase.from('users').delete().eq('id', userToDelete.id);
          if (error) throw error;

          setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
          alert("Usuário excluído com sucesso.");
      } catch (err: any) {
          console.error("Erro ao excluir:", err);
          alert(`Erro ao excluir: ${err.message}`);
      }
  };

  const openEdit = (user: User) => {
      setFormUser(user);
      setIsEditing(true);
      setShowModal(true);
  };

  const openNew = () => {
      setFormUser({ 
          active: true, 
          role: 'USER', 
          avatar: 'US',
          name: '',
          email: '',
          department: '',
          password: '' 
      });
      setIsEditing(false);
      setShowModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Gestão de Usuários</h2>
            <p className="text-slate-500 text-base mt-1">Controle de acesso e permissões (RBAC).</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('users')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeView === 'users'
                  ? 'bg-white text-clean-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <i className="fas fa-users mr-2"></i>
              Usuários
            </button>
            <button
              onClick={() => setActiveView('permissions')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeView === 'permissions'
                  ? 'bg-white text-clean-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <i className="fas fa-shield-alt mr-2"></i>
              Matriz
            </button>
            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setActiveView('editor')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeView === 'editor'
                    ? 'bg-white text-clean-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <i className="fas fa-user-shield mr-2"></i>
                Editor
              </button>
            )}
          </div>
          {activeView === 'users' && (
            <button onClick={openNew} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2">
              <i className="fas fa-user-plus"></i> Novo Usuário
            </button>
          )}
        </div>
      </header>

      {activeView === 'permissions' ? (
        <PermissionsMatrix />
      ) : activeView === 'editor' ? (
        <PermissionsEditor />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-base text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Cargo / Perfil</th>
                    <th className="px-6 py-4">Departamento</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                                    {u.avatar || u.name.substr(0,2).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-800">{u.name}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{u.email}</td>
                        <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
                                u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                u.role === 'EXECUTOR' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                u.role.startsWith('WAREHOUSE') ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {roles.find(r => r.id === u.role)?.label}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{u.department || '---'}</td>
                        <td className="px-6 py-4 text-center">
                            {u.active ? 
                                <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block" title="Ativo"></span> : 
                                <span className="w-3 h-3 bg-red-500 rounded-full inline-block" title="Inativo"></span>
                            }
                        </td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => openEdit(u)} className="text-slate-500 hover:text-blue-600 font-bold text-sm px-2 py-1 transition-colors" title="Editar">
                                    <i className="fas fa-pencil-alt"></i>
                                </button>
                                {currentUser.role === 'ADMIN' && u.id !== currentUser.id && (
                                    <button onClick={() => handleDelete(u)} className="text-slate-500 hover:text-red-600 font-bold text-sm px-2 py-1 transition-colors" title="Excluir">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                  <div className="relative w-full max-w-2xl my-8 bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                      
                      {/* Header Fixo */}
                      <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                          <div>
                              <h3 className="font-bold text-xl text-slate-800">{isEditing ? 'Editar Usuário' : 'Criar Novo Usuário'}</h3>
                              <p className="text-sm text-slate-500 mt-1">Controle de acesso e credenciais.</p>
                          </div>
                          <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"><i className="fas fa-times"></i></button>
                      </div>
                      
                      {/* Conteúdo Scrollable */}
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 min-h-0">
                          <form id="userForm" onSubmit={handleSave} className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome Completo</label>
                                      <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" value={formUser.name || ''} onChange={e => setFormUser({...formUser, name: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Departamento</label>
                                      <input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" value={formUser.department || ''} onChange={e => setFormUser({...formUser, department: e.target.value})} />
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email (Login)</label>
                                      <input type="email" required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" value={formUser.email || ''} onChange={e => setFormUser({...formUser, email: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Senha</label>
                                      <input type="text" className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary transition-all" placeholder={isEditing ? "(Manter atual)" : "Defina uma senha"} value={formUser.password || ''} onChange={e => setFormUser({...formUser, password: e.target.value})} />
                                  </div>
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Nível de Acesso (Cargo)</label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {roles.map(role => (
                                          <div key={role.id} onClick={() => setFormUser({...formUser, role: role.id})} className={`p-4 rounded-xl border cursor-pointer transition-all ${formUser.role === role.id ? 'bg-clean-primary/5 border-clean-primary ring-1 ring-clean-primary' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                                              <div className="flex items-center justify-between mb-1">
                                                  <span className={`font-bold text-sm ${formUser.role === role.id ? 'text-clean-primary' : 'text-slate-700'}`}>{role.label}</span>
                                                  {formUser.role === role.id && <i className="fas fa-check-circle text-clean-primary"></i>}
                                              </div>
                                              <p className="text-xs text-slate-500 leading-snug">{role.desc}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  <input type="checkbox" id="activeUser" className="w-5 h-5 text-clean-primary rounded border-slate-300 focus:ring-clean-primary" checked={formUser.active} onChange={e => setFormUser({...formUser, active: e.target.checked})} />
                                  <label htmlFor="activeUser" className="text-sm font-bold text-slate-700 cursor-pointer select-none">Usuário Ativo (Pode fazer login)</label>
                              </div>
                          </form>
                      </div>

                      {/* Footer Fixo */}
                      <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10 shrink-0">
                          <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-slate-200">Cancelar</button>
                          <button type="submit" form="userForm" disabled={loading} className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                              {loading ? 'Salvando...' : 'Salvar Usuário'}
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

export default UserManagement;
