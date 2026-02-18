/*
  # Criar tabela de permissões customizáveis por role

  1. Nova Tabela
    - `role_permissions`
      - `id` (uuid, primary key)
      - `role` (text) - papel do usuário (ADMIN, MANAGER, etc)
      - `module` (text) - módulo do sistema
      - `permissions` (jsonb) - objeto com permissões (view, create, edit, delete, export)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Habilitar RLS na tabela role_permissions
    - Políticas permitem acesso para usuários autenticados
    
  3. Importante
    - Esta tabela armazena customizações de permissões
    - Se não houver registro, usa as permissões padrão do código
    - Cada combinação role+module tem apenas um registro (unique constraint)
*/

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{"view": false, "create": false, "edit": false, "delete": false, "export": false}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, module)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar permissões"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir permissões"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar permissões"
  ON role_permissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem excluir permissões"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_module ON role_permissions(role, module);
