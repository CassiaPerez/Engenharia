
import React, { useMemo } from 'react';
import { Project, OS, Material, ServiceType, OSStatus } from '../types';
import { calculateProjectCosts } from '../services/engine';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface Props {
  projects: Project[];
  oss: OS[];
  materials: Material[];
  services: ServiceType[];
}

const Dashboard: React.FC<Props> = ({ projects, oss, materials, services }) => {
  const stats = useMemo(() => {
    const totalEstimated = projects.reduce((acc, p) => acc + p.estimatedValue, 0);
    const performanceData = projects.map(p => {
      const costs = calculateProjectCosts(p, oss, materials, services);
      return {
        name: p.code,
        budget: p.estimatedValue,
        real: costs.totalReal
      };
    });
    const delayedOS = oss.filter(o => o.status !== OSStatus.COMPLETED && new Date(o.limitDate) < new Date()).length;
    return { totalEstimated, performanceData, delayedOS };
  }, [projects, oss, materials, services]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-clean-text">Visão Geral</h2>
          <p className="text-clean-secondary text-sm mt-1">Dados fundamentais da sua operação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-clean-border card-shadow">
          <p className="text-[10px] font-bold text-clean-secondary uppercase tracking-widest mb-1">Total Orçado</p>
          <p className="text-2xl font-display font-bold text-clean-primary">R$ {stats.totalEstimated.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-clean-border card-shadow">
          <p className="text-[10px] font-bold text-clean-secondary uppercase tracking-widest mb-1">OS Atrasadas</p>
          <p className={`text-2xl font-display font-bold ${stats.delayedOS > 0 ? 'text-red-500' : 'text-clean-primary'}`}>{stats.delayedOS}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-clean-border card-shadow">
          <p className="text-[10px] font-bold text-clean-secondary uppercase tracking-widest mb-1">Projetos Ativos</p>
          <p className="text-2xl font-display font-bold text-clean-primary">{projects.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-clean-border card-shadow">
          <h3 className="text-sm font-bold text-clean-text mb-8">Performance Financeira</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Orçado" barSize={30} />
                <Bar dataKey="real" fill="#183c63" radius={[4, 4, 0, 0]} name="Real" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-clean-border card-shadow flex flex-col justify-center">
           <div className="text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-clean-border">
               <i className="fas fa-award text-clean-primary text-xl"></i>
             </div>
             <h4 className="text-sm font-bold text-clean-text">Saúde da Planta</h4>
             <p className="text-xs text-clean-secondary mt-2 px-4 italic">"Mantenha as OS preventivas em dia para evitar gargalos."</p>
             <button className="mt-6 px-6 py-2 bg-clean-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:brightness-110 transition-all">Ver Relatórios</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
