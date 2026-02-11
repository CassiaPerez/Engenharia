/*
  # Atualização do Schema - Documentação

  ## Mudanças Implementadas no Frontend (TypeScript)

  1. Novo Role de Usuário
    - **COORDINATOR**: Coordenador que pode repassar serviços para executores e cadastrar equipamentos
    - Permissões: Dashboard (view), Agenda (view/create/edit/export), Projetos (view), 
      OS (view/create/edit/export), Edifícios (view/create/edit), Equipamentos (view/create/edit/export),
      Serviços (view), Relatórios (view/export), Documentação (view)

  2. Role USER Atualizado
    - Removido acesso ao Dashboard
    - Adicionado acesso à Agenda de Serviços (view)
    - Adicionado acesso a Equipamentos (view/create)
    - Mantido acesso a OS (view/create) e Documentação (view)

  3. Novos Campos na Interface OS
    - `executorIds` (string[]): Suporte para múltiplos executores por OS
    - `executionDescription` (string): Descrição detalhada dos serviços executados na finalização
    - `pauseHistory` (array): Histórico de pausas e retomadas com timestamps, motivos e ações

  4. Nova Classificação de Serviço
    - **OPERATION_SUPPORT**: "Auxiliar de operação" adicionado ao enum OSType

  5. Funcionalidades de Pausa de Serviços
    - Executores podem pausar serviços em andamento informando o motivo
    - Podem retomar serviços pausados
    - Histórico completo de pausas e retomadas é registrado

  6. Campo de OS em Baixa de Almoxarifado
    - Adicionado campo `osNumber` nas movimentações de estoque
    - Permite rastreabilidade melhorada de baixas vinculadas a OS específicas

  ## Notas Técnicas

  - Todas as mudanças são compatíveis com a estrutura JSONB existente
  - Não há alterações no schema físico do banco de dados
  - Os dados são validados e tratados na camada de aplicação (TypeScript)
  - Mantida retrocompatibilidade com dados existentes
*/

-- Esta migration é apenas para documentação
-- Não há alterações no schema do banco de dados
-- Todas as mudanças são implementadas na camada de aplicação

SELECT 'Schema documentation updated' AS status;
