
import React from 'react';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <header className="mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">v1.5.2</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">Fix: Permissões de Delete</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Documentação Técnica & Setup</h1>
            <p className="text-slate-500 mt-2 text-lg">Manual de configuração do banco de dados e usuários.</p>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-clean-primary">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
                <h4 className="text-amber-800 font-bold m-0 flex items-center gap-2"><i className="fas fa-exclamation-triangle"></i> Atenção: Correção de Permissões</h4>
                <p className="text-amber-700 text-sm mt-1">
                    Se você está tendo problemas para <strong>Excluir</strong> registros (Erro 403 ou RLS Policy violation), copie e rode o script abaixo no Supabase. Ele limpa as políticas antigas e libera acesso total.
                </p>
            </div>

            <h3>1. Script de Correção de Permissões (SQL)</h3>
            <p>Copie e execute no <strong>SQL Editor</strong> do Supabase:</p>
            
            <div className="bg-slate-900 text-slate-200 p-6 rounded-xl text-xs font-mono overflow-x-auto my-6 shadow-lg border border-slate-800 relative group">
                <button onClick={() => navigator.clipboard.writeText(document.getElementById('sql-code')?.innerText || '')} className="absolute top-4 right-4 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs font-bold transition-all opacity-0 group-hover:opacity-100">Copiar SQL</button>
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <span className="text-emerald-400 font-bold">fix_permissions_rls.sql</span>
                    <span className="text-slate-500">PostgreSQL</span>
                </div>
                <pre id="sql-code">{`
-- EXTENSÕES
create extension if not exists "pgcrypto";

-- --- 1. PROJETOS ---
alter table projects enable row level security;
-- Limpeza de politicas antigas para evitar conflito
drop policy if exists "Public Access Projects" on projects;
drop policy if exists "Enable read access for all users" on projects;
drop policy if exists "Enable insert for all users" on projects;
drop policy if exists "Enable update for all users" on projects;
drop policy if exists "Enable delete for all users" on projects;
-- Criar nova politica TOTAL
create policy "Public Access Projects" on projects for all using (true) with check (true);

-- --- 2. ORDENS DE SERVIÇO ---
alter table oss enable row level security;
drop policy if exists "Public Access OS" on oss;
create policy "Public Access OS" on oss for all using (true) with check (true);

-- --- 3. MATERIAIS ---
alter table materials enable row level security;
drop policy if exists "Public Access Materials" on materials;
create policy "Public Access Materials" on materials for all using (true) with check (true);

-- --- 4. SERVIÇOS ---
alter table services enable row level security;
drop policy if exists "Public Access Services" on services;
create policy "Public Access Services" on services for all using (true) with check (true);

-- --- 5. FORNECEDORES ---
alter table suppliers enable row level security;
drop policy if exists "Public Access Suppliers" on suppliers;
create policy "Public Access Suppliers" on suppliers for all using (true) with check (true);

-- --- 6. EDIFÍCIOS ---
alter table buildings enable row level security;
drop policy if exists "Public Access Buildings" on buildings;
create policy "Public Access Buildings" on buildings for all using (true) with check (true);

-- --- 7. MOVIMENTAÇÕES ---
alter table stock_movements enable row level security;
drop policy if exists "Public Access Stock" on stock_movements;
create policy "Public Access Stock" on stock_movements for all using (true) with check (true);

-- --- 8. USUÁRIOS ---
alter table users enable row level security;
drop policy if exists "Public Access Users" on users;
create policy "Public Access Users" on users for all using (true) with check (true);

-- --- 9. COMPRAS ---
alter table purchases enable row level security;
drop policy if exists "Public Access Purchases" on purchases;
create policy "Public Access Purchases" on purchases for all using (true) with check (true);
                `}</pre>
            </div>

            <h3>2. Solução de Problemas Comuns</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                <li><strong>Erro ao excluir:</strong> Geralmente causado porque a política padrão do Supabase não inclui permissão <code>DELETE</code>. O script acima corrige isso usando <code>FOR ALL</code>.</li>
                <li><strong>Tabela não existe:</strong> Se o script der erro dizendo que a tabela não existe, certifique-se de ter rodado o script de criação inicial (<code>create table...</code>).</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
