
import React from 'react';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <header className="mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">v1.0.0</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">Stable</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Documentação Técnica</h1>
            <p className="text-slate-500 mt-2 text-lg">Manual de referência do Crop Service.</p>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-clean-primary">
            <h3>1. Visão Geral</h3>
            <p>O <strong>Crop Service</strong> é um sistema ERP modular focado em Engenharia e Manutenção, projetado para gerenciar de forma integrada o ciclo completo de projetos industriais (Capex) e operações (Opex).</p>
            
            <h3>2. Módulos Principais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose my-6">
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <h4 className="font-bold text-slate-800 mb-2">Gestão de Projetos (Capex)</h4>
                    <p className="text-sm text-slate-600">Controle orçamentário, físico e cronograma. Auditoria de realizado vs orçado.</p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <h4 className="font-bold text-slate-800 mb-2">Ordens de Serviço (Opex)</h4>
                    <p className="text-sm text-slate-600">Execução de manutenção, apontamento de horas e requisição de materiais.</p>
                </div>
            </div>

            <h3>3. Arquitetura</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                <li><strong>Frontend:</strong> React 19, TypeScript, Tailwind CSS.</li>
                <li><strong>State:</strong> React Hooks + LocalStorage (Persistência local).</li>
                <li><strong>Design:</strong> Enterprise UI System (Clean, Density-focused).</li>
            </ul>

            <h3>4. Roadmap</h3>
            <div className="flex items-center gap-4 text-sm mt-4">
                <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> <span>Curto Prazo: Perfis de Acesso</span>
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span> <span>Médio Prazo: API Integration</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
