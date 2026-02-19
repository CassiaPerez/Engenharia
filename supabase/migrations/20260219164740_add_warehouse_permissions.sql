/*
  # Adicionar Permissões de Almoxarifado

  1. Alterações na Tabela
    - Adiciona coluna `warehouses` na tabela `user_permissions`
      - Array de strings contendo os códigos dos almoxarifados que o usuário pode acessar
      - Exemplos: ['Cropbio'], ['Cropfert'], ['Cropbio', 'Cropfert'], ['Central']
  
  2. Funcionalidade
    - Permite que usuários almoxarifes tenham acesso a múltiplos almoxarifados
    - Usuários WAREHOUSE podem acessar todos os almoxarifados por padrão
    - Usuários WAREHOUSE_BIO e WAREHOUSE_FERT tem seus almoxarifados específicos por padrão
    - Administradores podem configurar permissões customizadas por usuário
  
  3. Notas
    - Campo opcional (NULL = usa permissões padrão do role)
    - Quando preenchido, sobrescreve as permissões padrão do role
*/

-- Adicionar coluna warehouses à tabela user_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'warehouses'
  ) THEN
    ALTER TABLE user_permissions 
    ADD COLUMN warehouses text[];
  END IF;
END $$;

-- Adicionar comentário na coluna
COMMENT ON COLUMN user_permissions.warehouses IS 'Lista de almoxarifados que o usuário pode acessar (ex: [Cropbio, Cropfert, Central]). NULL = usa permissões padrão do role.';

-- Criar índice para melhor performance em queries de almoxarifado
CREATE INDEX IF NOT EXISTS idx_user_permissions_warehouses ON user_permissions USING GIN (warehouses);

-- Exemplos de uso para documentação
COMMENT ON TABLE user_permissions IS 'Permissões customizadas por usuário. Campos:
- permissions: objeto JSONB com permissões por módulo
- field_permissions: objeto JSONB com permissões granulares por campo
- warehouses: array de strings com códigos de almoxarifados permitidos (NULL = padrão do role)

Exemplos de warehouses:
- [''Cropbio''] = acesso apenas ao almoxarifado Cropbio
- [''Cropfert''] = acesso apenas ao almoxarifado Cropfert  
- [''Cropbio'', ''Cropfert''] = acesso a ambos
- [''Central''] = acesso ao almoxarifado central
- NULL = usa permissões padrão do role (WAREHOUSE = todos, WAREHOUSE_BIO = Cropbio, WAREHOUSE_FERT = Cropfert)';
