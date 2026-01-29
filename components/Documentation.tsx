
import React from 'react';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <header className="mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">v1.6.1</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded">Fix Definitivo: Delete</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Correção de Permissões</h1>
            <p className="text-slate-500 mt-2 text-lg">Script manual para liberar exclusão e edição em todas as tabelas.</p>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-clean-primary">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-8 shadow-sm">
                <h4 className="text-amber-800 font-bold m-0 flex items-center gap-2 text-lg"><i className="fas fa-hammer"></i> Instruções</h4>
                <p className="text-amber-800 text-base mt-2">
                    O script anterior podia falhar silenciosamente. Este script remove todas as travas de segurança (RLS) e recria permissões públicas totais linha por linha.
                    <br/><br/>
                    <strong>Passo a passo:</strong>
                    <ol className="list-decimal pl-5 mt-2">
                        <li>Copie o código abaixo.</li>
                        <li>Vá no painel do Supabase &rarr; SQL Editor.</li>
                        <li>Cole e clique em <strong>RUN</strong>.</li>
                        <li>Se der erro "relation does not exist", ignore (significa que a tabela ainda não foi criada, o que é normal se o sistema for novo).</li>
                    </ol>
                </p>
            </div>

            <div className="bg-slate-900 text-slate-200 p-6 rounded-xl text-xs font-mono overflow-x-auto my-6 shadow-lg border border-slate-800 relative group">
                <button onClick={() => {
                    navigator.clipboard.writeText(document.getElementById('sql-manual')?.innerText || '');
                    alert('SQL Copiado!');
                }} className="absolute top-4 right-4 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer">
                    <i className="fas fa-copy"></i> Copiar SQL
                </button>
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <span className="text-emerald-400 font-bold text-sm">fix_permissions_final.sql</span>
                    <span className="text-slate-500">PostgreSQL</span>
                </div>
                <pre id="sql-manual" className="leading-relaxed text-blue-200">{`
-- 1. PROJETOS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Projects" ON projects;
DROP POLICY IF EXISTS "allow_all" ON projects;
CREATE POLICY "allow_all_projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- 2. ORDENS DE SERVIÇO
ALTER TABLE oss ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access OS" ON oss;
DROP POLICY IF EXISTS "allow_all" ON oss;
CREATE POLICY "allow_all_oss" ON oss FOR ALL USING (true) WITH CHECK (true);

-- 3. MATERIAIS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Materials" ON materials;
DROP POLICY IF EXISTS "allow_all" ON materials;
CREATE POLICY "allow_all_materials" ON materials FOR ALL USING (true) WITH CHECK (true);

-- 4. SERVIÇOS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Services" ON services;
DROP POLICY IF EXISTS "allow_all" ON services;
CREATE POLICY "allow_all_services" ON services FOR ALL USING (true) WITH CHECK (true);

-- 5. MOVIMENTAÇÕES DE ESTOQUE
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Stock" ON stock_movements;
DROP POLICY IF EXISTS "allow_all" ON stock_movements;
CREATE POLICY "allow_all_stock" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- 6. FORNECEDORES
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Suppliers" ON suppliers;
DROP POLICY IF EXISTS "allow_all" ON suppliers;
CREATE POLICY "allow_all_suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- 7. USUÁRIOS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Users" ON users;
DROP POLICY IF EXISTS "allow_all" ON users;
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

-- 8. COMPRAS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Purchases" ON purchases;
DROP POLICY IF EXISTS "allow_all" ON purchases;
CREATE POLICY "allow_all_purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);

-- 9. EDIFÍCIOS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Buildings" ON buildings;
DROP POLICY IF EXISTS "allow_all" ON buildings;
CREATE POLICY "allow_all_buildings" ON buildings FOR ALL USING (true) WITH CHECK (true);
                `}</pre>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
