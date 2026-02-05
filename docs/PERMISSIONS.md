# Sistema de Permissões (RBAC)

## Visão Geral

O CropService implementa um sistema robusto de controle de acesso baseado em funções (RBAC - Role-Based Access Control). Cada usuário possui uma função que determina exatamente quais módulos ele pode acessar e quais ações pode executar.

## Estrutura de Funções

### 1. ADMIN (Administrador)
**Acesso Total ao Sistema**
- Gestão completa de usuários
- Todas as permissões em todos os módulos
- Único perfil que pode excluir registros críticos
- Acesso à matriz de permissões

### 2. MANAGER (Gerente)
**Gestão Operacional Completa**
- Projetos, OS, Equipamentos e Relatórios
- Criação e edição em todos os módulos operacionais
- Sem acesso à gestão de usuários
- Pode exportar relatórios

### 3. EXECUTOR (Prestador de Serviço)
**Foco em Execução**
- Visualização de projetos e dashboard
- Execução e atualização de suas OS
- Painel simplificado focado em tarefas
- Sem acesso a módulos administrativos

### 4. USER (Usuário Comum)
**Visualização e Solicitações**
- Dashboard básico
- Abertura de novas OS
- Visualização limitada
- Documentação

### 5. WAREHOUSE (Almoxarifado Geral)
**Supervisão Total de Estoque**
- Gestão completa do almoxarifado
- Acesso a todas as unidades
- Movimentações e transferências
- Gestão de fornecedores

### 6. WAREHOUSE_BIO e WAREHOUSE_FERT
**Almoxarifados de Unidade**
- Gestão restrita à sua unidade
- Movimentações locais
- Relatórios da unidade
- Visualização de fornecedores

## Estrutura de Permissões

Cada módulo possui 5 tipos de ações:

1. **VIEW** - Visualizar/Acessar o módulo
2. **CREATE** - Criar novos registros
3. **EDIT** - Editar registros existentes
4. **DELETE** - Excluir registros
5. **EXPORT** - Exportar dados

## Uso no Código

### Verificação de Permissão em Componentes

```typescript
import { hasPermission } from '../services/permissions';
import { useModulePermissions } from '../hooks/usePermissions';

// Em um componente funcional
const MyComponent: React.FC<Props> = ({ currentUser }) => {
  const { hasPermission } = useModulePermissions(currentUser.role);

  const canEdit = hasPermission('projects', 'edit');
  const canDelete = hasPermission('projects', 'delete');

  return (
    <div>
      {canEdit && (
        <button onClick={handleEdit}>Editar</button>
      )}
      {canDelete && (
        <button onClick={handleDelete}>Excluir</button>
      )}
    </div>
  );
};
```

### Componente de Proteção

```typescript
import ProtectedAction from '../components/ProtectedAction';

<ProtectedAction
  role={currentUser.role}
  module="projects"
  action="delete"
>
  <button onClick={handleDelete}>Excluir Projeto</button>
</ProtectedAction>
```

### Verificação Direta

```typescript
import { hasPermission } from '../services/permissions';

if (hasPermission(user.role, 'inventory', 'create')) {
  // Permitir criação
}
```

## Matriz de Permissões

A matriz completa pode ser visualizada em:
**Sistema > Usuários > Aba "Permissões"**

A matriz mostra visualmente todas as permissões de cada função, facilitando o entendimento do controle de acesso.

## Modificação de Permissões

Para alterar as permissões do sistema:

1. Edite o arquivo: `services/permissions.ts`
2. Localize a constante `PERMISSIONS_MATRIX`
3. Modifique as permissões desejadas
4. As alterações são aplicadas automaticamente

**Importante:** Apenas desenvolvedores devem modificar a matriz de permissões. Mudanças incorretas podem comprometer a segurança do sistema.

## Melhores Práticas

1. **Sempre verifique permissões** antes de ações críticas (editar, excluir)
2. **Oculte botões** que o usuário não pode acessar
3. **Valide no backend** - nunca confie apenas no frontend
4. **Use componentes de proteção** para código mais limpo
5. **Documente mudanças** na matriz de permissões

## Fluxo de Autenticação

1. Usuário faz login
2. Sistema carrega o `role` do usuário
3. Menu é filtrado automaticamente
4. Componentes verificam permissões
5. Ações não permitidas são ocultadas/desabilitadas

## Segurança

- Permissões são verificadas em múltiplas camadas
- Usuários não conseguem acessar funcionalidades não autorizadas
- Logs de auditoria registram ações críticas
- Sessão é validada a cada operação sensível

## Extensibilidade

Para adicionar um novo módulo:

1. Adicione o módulo em `ModuleId` (permissions.ts)
2. Adicione o label em `MODULE_LABELS`
3. Configure permissões em `PERMISSIONS_MATRIX`
4. O módulo estará automaticamente protegido

## Suporte

Para dúvidas sobre permissões:
- Consulte a matriz visual no sistema
- Verifique este documento
- Contate o administrador do sistema
