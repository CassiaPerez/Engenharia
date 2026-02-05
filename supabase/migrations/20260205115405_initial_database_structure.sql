/*
  # Estrutura Inicial do Banco de Dados CropService ERP

  ## Descrição
  Cria todas as tabelas necessárias para o funcionamento do sistema ERP de gestão de serviços industriais.

  ## Tabelas Criadas
  1. **projects** - Projetos CAPEX
  2. **materials** - Materiais de almoxarifado
  3. **oss** - Ordens de Serviço
  4. **services** - Catálogo de serviços
  5. **stock_movements** - Movimentações de estoque
  6. **suppliers** - Fornecedores
  7. **users** - Usuários do sistema
  8. **purchases** - Histórico de compras
  9. **buildings** - Edifícios/Unidades
  10. **equipments** - Equipamentos industriais

  ## Estrutura
  Todas as tabelas usam formato JSONB para flexibilidade e facilidade de evolução do schema.
  
  ## Segurança
  - Row Level Security (RLS) habilitado em todas as tabelas
  - Políticas de acesso público para operação interna (ajustar conforme necessidade)

  ## Notas Importantes
  - Este é um sistema interno, as políticas de acesso são permissivas
  - Em produção, ajustar as políticas de RLS conforme regras de negócio
  - O campo json_content armazena todo o objeto em formato JSON
*/

-- Habilita extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELA: PROJECTS (Projetos CAPEX)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: MATERIALS (Materiais de Almoxarifado)
-- =====================================================
CREATE TABLE IF NOT EXISTS materials (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: OSS (Ordens de Serviço)
-- =====================================================
CREATE TABLE IF NOT EXISTS oss (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: SERVICES (Catálogo de Serviços)
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: STOCK_MOVEMENTS (Movimentações de Estoque)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: SUPPLIERS (Fornecedores)
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: USERS (Usuários do Sistema)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: PURCHASES (Histórico de Compras)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: BUILDINGS (Edifícios/Unidades)
-- =====================================================
CREATE TABLE IF NOT EXISTS buildings (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- TABELA: EQUIPMENTS (Equipamentos Industriais)
-- =====================================================
CREATE TABLE IF NOT EXISTS equipments (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- SEGURANÇA: HABILITAR ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE oss ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE ACESSO
-- =====================================================

-- Política para PROJECTS
DROP POLICY IF EXISTS "Public Access Projects" ON projects;
CREATE POLICY "Public Access Projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- Política para MATERIALS
DROP POLICY IF EXISTS "Public Access Materials" ON materials;
CREATE POLICY "Public Access Materials" ON materials FOR ALL USING (true) WITH CHECK (true);

-- Política para OSS
DROP POLICY IF EXISTS "Public Access OS" ON oss;
CREATE POLICY "Public Access OS" ON oss FOR ALL USING (true) WITH CHECK (true);

-- Política para SERVICES
DROP POLICY IF EXISTS "Public Access Services" ON services;
CREATE POLICY "Public Access Services" ON services FOR ALL USING (true) WITH CHECK (true);

-- Política para STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Public Access Stock" ON stock_movements;
CREATE POLICY "Public Access Stock" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- Política para SUPPLIERS
DROP POLICY IF EXISTS "Public Access Suppliers" ON suppliers;
CREATE POLICY "Public Access Suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- Política para USERS
DROP POLICY IF EXISTS "Public Access Users" ON users;
CREATE POLICY "Public Access Users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Política para PURCHASES
DROP POLICY IF EXISTS "Public Access Purchases" ON purchases;
CREATE POLICY "Public Access Purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);

-- Política para BUILDINGS
DROP POLICY IF EXISTS "Public Access Buildings" ON buildings;
CREATE POLICY "Public Access Buildings" ON buildings FOR ALL USING (true) WITH CHECK (true);

-- Política para EQUIPMENTS
DROP POLICY IF EXISTS "Public Access Equipments" ON equipments;
CREATE POLICY "Public Access Equipments" ON equipments FOR ALL USING (true) WITH CHECK (true);
