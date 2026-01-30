
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import ModalPortal from './ModalPortal';

interface Props {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
}

const UserManagement: React.FC<Props> = ({ users, setUsers, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
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
    { id: 'USER', label: 'Usuário Comum', desc: 'Acesso básico de visualização.' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && formUser.id) {
        setUsers(prev => prev.map(u => u.id === formUser.id ? { ...u, ...formUser } as User : u));
    } else {
        const newUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            name: formUser.name!,
            email: formUser.email!,
            password: formUser.password || '123456', // Default password
            role: formUser.role || 'USER',
            department: formUser.department || '',
            active: formUser.active ?? true,
            avatar: formUser.name?.substr(0, 2).toUpperCase() || 'US'
        };
        setUsers(prev => [...prev, newUser]);
    }
    setShowModal(false);
    setFormUser({ active: true, role: 'USER', avatar: 'US' });
    setIsEditing(false);
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
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Gestão de Usuários</h2>
            <p className="text-slate-500 text-base mt-1">Controle de acesso e permissões (RBAC).</p>
        </div>
        <button onClick={openNew} className="bg-clean-primary text-white px-6 py-3 rounded-xl text-sm font-bold uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2">
            <i className="fas fa-user-plus"></i> Novo Usuário
        </button>
      </header>

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
                            <button onClick={() => openEdit(u)} className="text-slate-400 hover:text-clean-primary font-bold text-sm border border-slate-200 px-3 py-1.5 rounded bg-white hover:bg-slate-50 transition-all shadow-sm">
                                Editar
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

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
                          <button type="submit" form="userForm" className="px-8 py-3 bg-clean-primary text-white rounded-xl text-sm font-bold hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/30 transform hover:-translate-y-0.5 transition-all">Salvar Usuário</button>
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
