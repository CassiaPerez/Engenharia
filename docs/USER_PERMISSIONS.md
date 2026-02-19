# Sistema de Permissões por Usuário

## Visão Geral

O sistema CropService agora implementa permissões granulares por usuário, permitindo customizar permissões específicas para cada usuário individual, além das permissões baseadas em perfil (role).

## Como Funciona

### Herança de Permissões

1. **Permissões de Perfil (Padrão)**
   - Todo usuário herda automaticamente as permissões do seu perfil
   - Perfis disponíveis: ADMIN, MANAGER, COORDINATOR, EXECUTOR, USER, WAREHOUSE, WAREHOUSE_BIO, WAREHOUSE_FERT

2. **Permissões Customizadas**
   - Administradores podem sobrescrever permissões específicas para usuários individuais
   - As permissões customizadas têm prioridade sobre as permissões do perfil
   - Usuários mantêm suas permissões de perfil para módulos não customizados

### Estrutura de Permissões

Cada módulo possui 5 tipos de permissões:
- **Ver** - Visualizar/Acessar o módulo
- **Criar** - Criar novos registros
- **Editar** - Modificar registros existentes
- **Excluir** - Remover registros
- **Exportar** - Exportar dados do módulo

## Gerenciamento de Permissões

### Acessar o Editor de Permissões

1. Acesse **Sistema > Gestão de Usuários**
2. Localize o usuário desejado na lista
3. Clique no ícone de cadeado (🔒) ao lado das ações do usuário
4. O editor de permissões será aberto

### Interface do Editor

O editor mostra:
- Informações do usuário (nome, email, perfil)
- Tabela de permissões por módulo
- Indicador visual para módulos customizados (fundo amarelo)
- Botões para resetar permissões individuais ou todas

### Customizar Permissões

1. No editor, marque ou desmarque as caixas de seleção para cada permissão
2. Módulos modificados aparecerão com fundo amarelo
3. Clique em **Salvar Permissões** para aplicar as mudanças

### Resetar Permissões

**Resetar Módulo Individual:**
- Clique em "Resetar Módulo" na linha do módulo
- O usuário voltará a usar as permissões do perfil para aquele módulo

**Resetar Todas Permissões:**
- Clique em "Resetar Todas Permissões" no rodapé
- Confirme a ação
- Todas customizações serão removidas
- O usuário voltará a usar apenas as permissões do perfil

## Casos de Uso

### Exemplo 1: Acesso Temporário

Um usuário com perfil USER precisa temporariamente acessar relatórios:

1. Abra o editor de permissões do usuário
2. No módulo "Relatórios", marque "Ver" e "Exportar"
3. Salve as alterações
4. Quando não for mais necessário, clique em "Resetar Módulo" para o módulo Relatórios

### Exemplo 2: Restrição Específica

Um usuário MANAGER não deve poder excluir projetos:

1. Abra o editor de permissões do usuário
2. No módulo "Projetos", desmarque "Excluir"
3. Salve as alterações
4. O usuário manterá todas as outras permissões de MANAGER, exceto excluir projetos

### Exemplo 3: Permissões Especiais

Um usuário precisa de acesso a múltiplos módulos que seu perfil não cobre:

1. Customize cada módulo necessário
2. As permissões customizadas se acumulam
3. O usuário terá acesso a todos os módulos customizados + módulos do perfil

## Segurança

### Políticas de Acesso

- **Visualização**: Usuários podem ver suas próprias permissões customizadas
- **Modificação**: Apenas ADMIN pode criar, editar ou excluir permissões customizadas
- **Auditoria**: Todas alterações são registradas no banco de dados

### RLS (Row Level Security)

O banco de dados aplica as seguintes regras:
- Usuários autenticados podem visualizar suas próprias permissões
- Apenas ADMIN pode modificar permissões de qualquer usuário
- Exclusão em cascata: se um usuário for excluído, suas permissões customizadas também serão

## Banco de Dados

### Tabela: user_permissions

```sql
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  module text NOT NULL,
  permissions jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module)
);
```

### Estrutura JSONB de Permissões

```json
{
  "view": true,
  "create": false,
  "edit": true,
  "delete": false,
  "export": true
}
```

## Uso Programático

### Verificar Permissões com userId

```typescript
import { hasPermission } from '../services/permissions';

// Verificar permissão com userId
const canEdit = hasPermission(user.role, 'projects', 'edit', user.id);

// Sem userId, usa apenas permissões do role
const canEditRole = hasPermission(user.role, 'projects', 'edit');
```

### Hook de Permissões

```typescript
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = ({ user }) => {
  const { canEdit, canDelete } = usePermissions(user.role, 'projects', user.id);

  return (
    <div>
      {canEdit && <button>Editar</button>}
      {canDelete && <button>Excluir</button>}
    </div>
  );
};
```

### Componente Protegido

```typescript
import ProtectedAction from './ProtectedAction';

<ProtectedAction
  role={user.role}
  module="projects"
  action="delete"
  userId={user.id}
>
  <button>Excluir Projeto</button>
</ProtectedAction>
```

## Funções da API

### loadUserPermissions(userId?)
Carrega permissões customizadas do banco de dados. Se userId for fornecido, carrega apenas para aquele usuário.

### saveUserPermissions(userId, module, permissions)
Salva ou atualiza permissões customizadas para um usuário específico em um módulo.

### deleteUserPermissions(userId, module)
Remove permissões customizadas de um módulo, voltando às permissões do perfil.

### resetUserPermissions(userId)
Remove todas as permissões customizadas de um usuário.

### getUserCustomPermissions(userId)
Retorna todas as permissões customizadas de um usuário.

### hasUserCustomPermissions(userId)
Verifica se um usuário possui alguma permissão customizada.

## Melhores Práticas

1. **Use permissões de perfil como base** - Customize apenas quando necessário
2. **Documente mudanças** - Mantenha registro de por que permissões foram customizadas
3. **Revise periodicamente** - Verifique se permissões customizadas ainda são necessárias
4. **Prefira perfis** - Se muitos usuários precisam das mesmas permissões, considere criar um novo perfil
5. **Teste após mudanças** - Verifique que o usuário tem acesso correto após customização

## Troubleshooting

### Usuário não tem acesso esperado

1. Verifique se há permissões customizadas (ícone de cadeado na lista de usuários)
2. No editor, confirme quais módulos estão customizados (fundo amarelo)
3. Verifique o perfil do usuário
4. Tente resetar as permissões customizadas e aplicar novamente

### Permissões não estão sendo salvas

1. Verifique se você é ADMIN
2. Verifique o console do navegador para erros
3. Confirme que o banco de dados está acessível
4. Verifique as políticas RLS no Supabase

### Performance

- As permissões são carregadas em cache na inicialização do app
- Mudanças exigem recarregar o cache (relogar ou recarregar página)
- Para performance ótima, use permissões de perfil sempre que possível

## Suporte

Para dúvidas sobre o sistema de permissões:
- Consulte a matriz de permissões em **Sistema > Usuários > Matriz**
- Verifique a documentação de perfis em `PERMISSIONS.md`
- Entre em contato com o administrador do sistema
