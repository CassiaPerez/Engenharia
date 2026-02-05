/*
  # Adicionar Usuários Reais ao Sistema

  ## Descrição
  Remove usuários de exemplo e adiciona os usuários reais da Crop Service:
  - Administradores e Gerentes
  - Almoxarifes de cada unidade
  - Executores de serviço

  ## Usuários Criados

  ### Gerência
  - Wellingnton: Gerente (OS, serviços, projetos e relatórios)

  ### Almoxarifado
  - Amanda: Almoxarife CropFert
  - Cesar: Almoxarife CropBio (local)

  ### Executores
  - Rildo: Prestador de Serviço
  - Lincoln: Prestador de Serviço
  - Gabriel: Prestador de Serviço
  - Elton: Prestador de Serviço
  - Maycon: Prestador de Serviço

  ## Segurança
  - Senha padrão: "123" (deve ser alterada no primeiro acesso)
  - Todos os usuários ativos por padrão
  
  ## Notas
  - IDs gerados sequencialmente para facilitar identificação
  - Avatares baseados nas iniciais do nome
*/

-- Remove usuários de exemplo (se existirem)
DELETE FROM users WHERE id IN ('U001', 'U002', 'U003', 'U004', 'U005');

-- =====================================================
-- GERÊNCIA
-- =====================================================

-- Wellingnton - Gerente (Projetos, OS, Serviços, Relatórios)
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-001',
  jsonb_build_object(
    'id', 'USR-001',
    'name', 'Wellingnton',
    'email', 'wellingnton@cropservice.com',
    'password', '123',
    'role', 'MANAGER',
    'department', 'Engenharia',
    'active', true,
    'avatar', 'WG'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();

-- =====================================================
-- ALMOXARIFADO
-- =====================================================

-- Amanda - Almoxarife CropFert
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-002',
  jsonb_build_object(
    'id', 'USR-002',
    'name', 'Amanda',
    'email', 'amanda@cropservice.com',
    'password', '123',
    'role', 'WAREHOUSE_FERT',
    'department', 'Almoxarifado CropFert',
    'active', true,
    'avatar', 'AM'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();

-- Cesar - Almoxarife CropBio (Local)
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-003',
  jsonb_build_object(
    'id', 'USR-003',
    'name', 'Cesar',
    'email', 'cesar@cropservice.com',
    'password', '123',
    'role', 'WAREHOUSE_BIO',
    'department', 'Almoxarifado CropBio',
    'active', true,
    'avatar', 'CS'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();

-- =====================================================
-- EXECUTORES
-- =====================================================

-- Rildo - Executor
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-004',
  jsonb_build_object(
    'id', 'USR-004',
    'name', 'Rildo',
    'email', 'rildo@cropservice.com',
    'password', '123',
    'role', 'EXECUTOR',
    'department', 'Manutenção',
    'active', true,
    'avatar', 'RL'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();

-- Lincoln - Executor
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-005',
  jsonb_build_object(
    'id', 'USR-005',
    'name', 'Lincoln',
    'email', 'lincoln@cropservice.com',
    'password', '123',
    'role', 'EXECUTOR',
    'department', 'Manutenção',
    'active', true,
    'avatar', 'LC'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();

-- Gabriel - Executor
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-006',
  jsonb_build_object(
    'id', 'USR-006',
    'name', 'Gabriel',
    'email', 'gabriel@cropservice.com',
    'password', '123',
    'role', 'EXECUTOR',
    'department', 'Manutenção',
    'active', true,
    'avatar', 'GB'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();

-- Elton - Executor
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-007',
  jsonb_build_object(
    'id', 'USR-007',
    'name', 'Elton',
    'email', 'elton@cropservice.com',
    'password', '123',
    'role', 'EXECUTOR',
    'department', 'Manutenção',
    'active', true,
    'avatar', 'EL'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();

-- Maycon - Executor
INSERT INTO users (id, json_content, updated_at)
VALUES (
  'USR-008',
  jsonb_build_object(
    'id', 'USR-008',
    'name', 'Maycon',
    'email', 'maycon@cropservice.com',
    'password', '123',
    'role', 'EXECUTOR',
    'department', 'Manutenção',
    'active', true,
    'avatar', 'MY'
  ),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  json_content = EXCLUDED.json_content,
  updated_at = NOW();