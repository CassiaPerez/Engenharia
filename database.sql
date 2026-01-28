
-- --- SCRIPT DE INICIALIZAÇÃO DE BANCO DE DADOS (SUPABASE / POSTGRESQL) ---
-- Execute este script no SQL Editor do seu projeto Supabase.

-- Habilita extensão pgcrypto para geração de UUIDs (opcional se usar ids de app)
create extension if not exists "pgcrypto";

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

-- 7. Tabela de Usuários (RBAC Simplificado)
create table if not exists users (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Tabela de Compras (Purchases)
create table if not exists purchases (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Tabela de Edifícios (Facilities)
create table if not exists buildings (
  id text primary key,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- --- SEGURANÇA (ROW LEVEL SECURITY - RLS) ---
-- Habilita RLS em todas as tabelas
alter table projects enable row level security;
alter table materials enable row level security;
alter table oss enable row level security;
alter table services enable row level security;
alter table stock_movements enable row level security;
alter table suppliers enable row level security;
alter table users enable row level security;
alter table purchases enable row level security;
alter table buildings enable row level security;

-- --- POLÍTICAS DE ACESSO (PERMISSIVE/PUBLIC PARA PROTOTIPAGEM) ---
-- ATENÇÃO: Estas políticas permitem leitura/escrita pública (Anon Key).
-- Em produção, altere para autenticated users ou lógica específica.

-- Projects
drop policy if exists "Public Access Projects" on projects;
create policy "Public Access Projects" on projects for all using (true) with check (true);

-- Materials
drop policy if exists "Public Access Materials" on materials;
create policy "Public Access Materials" on materials for all using (true) with check (true);

-- OSs
drop policy if exists "Public Access OS" on oss;
create policy "Public Access OS" on oss for all using (true) with check (true);

-- Services
drop policy if exists "Public Access Services" on services;
create policy "Public Access Services" on services for all using (true) with check (true);

-- Stock Movements
drop policy if exists "Public Access Stock" on stock_movements;
create policy "Public Access Stock" on stock_movements for all using (true) with check (true);

-- Suppliers
drop policy if exists "Public Access Suppliers" on suppliers;
create policy "Public Access Suppliers" on suppliers for all using (true) with check (true);

-- Users
drop policy if exists "Public Access Users" on users;
create policy "Public Access Users" on users for all using (true) with check (true);

-- Purchases
drop policy if exists "Public Access Purchases" on purchases;
create policy "Public Access Purchases" on purchases for all using (true) with check (true);

-- Buildings
drop policy if exists "Public Access Buildings" on buildings;
create policy "Public Access Buildings" on buildings for all using (true) with check (true);
