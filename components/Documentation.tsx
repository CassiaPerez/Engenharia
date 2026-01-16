
import React from 'react';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <header className="mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">v1.2.0</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">Database Ready</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Documentação Técnica & Setup</h1>
            <p className="text-slate-500 mt-2 text-lg">Manual de configuração do banco de dados.</p>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-clean-primary">
            <h3>1. Inicialização do Banco de Dados (Supabase)</h3>
            <p>Para persistir todos os dados do sistema, copie o script abaixo e execute-o na aba <strong>SQL Editor</strong> do seu painel Supabase.</p>
            <p>Este script cria as tabelas no formato <em>JSON Document Store</em>, garantindo compatibilidade total com os tipos de dados da aplicação React.</p>
            
            <div className="bg-slate-900 text-slate-200 p-6 rounded-xl text-xs font-mono overflow-x-auto my-6 shadow-lg border border-slate-800">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <span className="text-emerald-400 font-bold">setup_database.sql</span>
                    <span className="text-slate-500">PostgreSQL</span>
                </div>
                <pre>{`
-- 1. Tabela de Projetos (Capex)
create table if not exists projects (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabela de Materiais (Almoxarifado)
create table if not exists materials (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Tabela de Ordens de Serviço (Opex)
create table if not exists oss (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Tabela de Serviços (Catálogo)
create table if not exists services (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Tabela de Movimentações de Estoque (Kardex)
create table if not exists stock_movements (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Tabela de Fornecedores
create table if not exists suppliers (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- --- SEGURANÇA (RLS) ---
-- Habilita Row Level Security em todas as tabelas
alter table projects enable row level security;
alter table materials enable row level security;
alter table oss enable row level security;
alter table services enable row level security;
alter table stock_movements enable row level security;
alter table suppliers enable row level security;

-- Cria políticas de acesso PÚBLICO (Para uso imediato com a chave Anon Key)
-- Nota: Em produção real com Login, alterar 'true' para checagem de auth.uid()

-- Projects
create policy "Enable all access for projects" on projects for all using (true) with check (true);

-- Materials
create policy "Enable all access for materials" on materials for all using (true) with check (true);

-- OSS
create policy "Enable all access for oss" on oss for all using (true) with check (true);

-- Services
create policy "Enable all access for services" on services for all using (true) with check (true);

-- Stock Movements
create policy "Enable all access for stock_movements" on stock_movements for all using (true) with check (true);

-- Suppliers
create policy "Enable all access for suppliers" on suppliers for all using (true) with check (true);
                `}</pre>
            </div>

            <h3>2. Como funciona a Sincronização?</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                <li><strong>Híbrido:</strong> O sistema carrega dados do Supabase ao iniciar. Se falhar, usa o cache local do navegador.</li>
                <li><strong>Auto-Save:</strong> As alterações são salvas automaticamente a cada 2 segundos após parar de digitar (Debounce).</li>
                <li><strong>Estrutura de Dados:</strong> Utilizamos colunas <code>jsonb</code>. Isso significa que não precisamos fazer "Joins" complexos no banco; o objeto JSON salvo é exatamente o objeto TypeScript usado no Frontend.</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
