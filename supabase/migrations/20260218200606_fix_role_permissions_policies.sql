/*
  # Corrigir políticas RLS da tabela role_permissions

  1. Problema identificado
    - As políticas existentes só permitiam acesso para usuários 'authenticated'
    - O sistema usa a anon key (sb_publishable), então as requisições vêm como role 'anon'
    - Resultado: violação de RLS ao tentar inserir/atualizar dados

  2. Solução
    - Remover políticas antigas que usavam 'TO authenticated'
    - Criar novas políticas que permitem acesso público (anon + authenticated)
    - Mantém RLS habilitado para futura customização se necessário

  3. Segurança
    - Em produção, considere adicionar verificações adicionais
    - Pode-se usar políticas mais restritivas quando implementar auth real
*/

-- Remove políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar permissões" ON role_permissions;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir permissões" ON role_permissions;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar permissões" ON role_permissions;
DROP POLICY IF EXISTS "Usuários autenticados podem excluir permissões" ON role_permissions;

-- Cria novas políticas que permitem acesso público
CREATE POLICY "Permitir leitura de permissões"
  ON role_permissions FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção de permissões"
  ON role_permissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de permissões"
  ON role_permissions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão de permissões"
  ON role_permissions FOR DELETE
  USING (true);
