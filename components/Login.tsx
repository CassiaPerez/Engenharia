
import React, { useState } from 'react';
import { User } from '../types';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ users, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      if (!user.active) {
        setError('Usuário inativo. Contate o administrador.');
        return;
      }
      onLogin(user);
    } else {
      setError('Credenciais inválidas.');
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Left Column - Image & Brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 relative overflow-hidden">
         <div className="absolute inset-0 z-0">
             <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2670&auto=format&fit=crop" className="w-full h-full object-cover opacity-30 mix-blend-overlay" alt="Industrial Background" />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/60"></div>
         </div>
         
         <div className="relative z-10 p-12">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 text-emerald-400 text-3xl">
                  <i className="fas fa-fingerprint"></i>
               </div>
               <span className="text-3xl font-black text-white tracking-tighter">CropService</span>
            </div>
         </div>

         <div className="relative z-10 p-12 mb-12">
             <h1 className="text-5xl font-black text-white mb-6 leading-tight tracking-tight">Gestão Inteligente para <span className="text-emerald-400">Engenharia e Governança</span></h1>
             <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
                Plataforma integrada de ERP Industrial. Controle projetos Capex, Ordens de Serviço, Estoque e Compliance em um único ambiente seguro e escalável.
             </p>
         </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 lg:p-16">
         <div className="w-full max-w-md space-y-8">
             <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center items-center gap-2 mb-6 text-slate-900">
                    <i className="fas fa-fingerprint text-emerald-500 text-3xl"></i>
                    <span className="text-3xl font-black tracking-tighter">CropService</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta</h2>
                <p className="text-slate-500 mt-2">Acesse sua conta corporativa para continuar.</p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email Corporativo</label>
                        <div className="relative">
                            <input 
                                type="email" 
                                required 
                                className="w-full h-14 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                placeholder="nome@empresa.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i className="fas fa-envelope"></i>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Senha de Acesso</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                required 
                                className="w-full h-14 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i className="fas fa-lock"></i>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <i className="fas fa-triangle-exclamation text-lg"></i> {error}
                    </div>
                )}

                <button type="submit" className="w-full h-14 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/20 hover:shadow-emerald-600/30 flex items-center justify-center gap-2 text-lg group">
                    <span>Acessar Painel</span>
                    <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </button>
             </form>
             
             <div className="pt-8 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 font-medium">
                   &copy; {new Date().getFullYear()} CropService Engineering.
                   <br/>Acesso monitorado e restrito.
                </p>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Login;
