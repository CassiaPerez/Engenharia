/*
  # Adicionar Permissões de Campos Específicos

  1. Alterações
    - Adiciona coluna `field_permissions` à tabela `user_permissions`
    - Permite controle granular de permissões por campo em cada módulo
    - Campo JSONB para armazenar permissões específicas de campos
    
  2. Estrutura de Dados
    - field_permissions: {
        "fieldName": { "edit": true/false },
        ...
      }
    
  3. Exemplo de Uso
    - Para módulo OS, pode ter: {
        "priority": { "edit": true },
        "executor_id": { "edit": true },
        "sla_date": { "edit": true }
      }
    
  4. Notas
    - Campo opcional, se NULL usa permissões padrão do módulo
    - Permite override de permissões específicas por campo
    - Mantém compatibilidade com sistema de permissões existente
*/

-- Adicionar coluna de permissões de campos à tabela user_permissions
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS field_permissions jsonb DEFAULT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN user_permissions.field_permissions IS 'Permissões granulares por campo. Formato: {"fieldName": {"edit": boolean}}';

-- Criar índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_user_permissions_field_permissions 
ON user_permissions USING gin(field_permissions);
