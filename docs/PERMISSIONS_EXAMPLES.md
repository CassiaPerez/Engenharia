# Exemplos Práticos de Uso de Permissões

## Exemplos de Implementação

### 1. Botão de Ação Condicional

```typescript
import { hasPermission } from '../services/permissions';

const ProjectCard: React.FC<{ project: Project; currentUser: User }> = ({ project, currentUser }) => {
  const canEdit = hasPermission(currentUser.role, 'projects', 'edit');
  const canDelete = hasPermission(currentUser.role, 'projects', 'delete');

  return (
    <div className="project-card">
      <h3>{project.name}</h3>

      <div className="actions">
        {canEdit && (
          <button onClick={() => handleEdit(project)}>
            <i className="fas fa-edit"></i> Editar
          </button>
        )}

        {canDelete && (
          <button onClick={() => handleDelete(project)}>
            <i className="fas fa-trash"></i> Excluir
          </button>
        )}
      </div>
    </div>
  );
};
```

### 2. Usando o Hook usePermissions

```typescript
import { usePermissions } from '../hooks/usePermissions';

const InventoryPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { canCreate, canEdit, canDelete, canExport } = usePermissions(
    currentUser.role,
    'inventory'
  );

  return (
    <div>
      <header>
        <h1>Almoxarifado</h1>
        {canCreate && (
          <button onClick={openNewMaterialModal}>
            <i className="fas fa-plus"></i> Novo Material
          </button>
        )}
        {canExport && (
          <button onClick={exportToExcel}>
            <i className="fas fa-download"></i> Exportar
          </button>
        )}
      </header>

      <table>
        {materials.map(material => (
          <tr key={material.id}>
            <td>{material.description}</td>
            <td>
              {canEdit && <button onClick={() => edit(material)}>Editar</button>}
              {canDelete && <button onClick={() => remove(material)}>Excluir</button>}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
};
```

### 3. Componente ProtectedAction

```typescript
import ProtectedAction from '../components/ProtectedAction';

const ServiceCard: React.FC<Props> = ({ service, currentUser }) => {
  return (
    <div className="service-card">
      <h3>{service.name}</h3>
      <p>{service.description}</p>

      <div className="actions">
        <ProtectedAction
          role={currentUser.role}
          module="services"
          action="edit"
        >
          <button onClick={() => handleEdit(service)}>
            Editar Serviço
          </button>
        </ProtectedAction>

        <ProtectedAction
          role={currentUser.role}
          module="services"
          action="delete"
          fallback={
            <span className="text-muted">
              Sem permissão para excluir
            </span>
          }
        >
          <button onClick={() => handleDelete(service)}>
            Excluir Serviço
          </button>
        </ProtectedAction>
      </div>
    </div>
  );
};
```

### 4. Validação com Mensagem de Erro

```typescript
import { hasPermission } from '../services/permissions';

const handleDeleteProject = (projectId: string) => {
  // Validação de permissão antes da ação
  if (!hasPermission(currentUser.role, 'projects', 'delete')) {
    alert('Você não tem permissão para excluir projetos.');
    return;
  }

  // Confirmação adicional
  if (!confirm('Tem certeza que deseja excluir este projeto?')) {
    return;
  }

  // Executa a exclusão
  deleteProject(projectId);
};
```

### 5. Verificação Múltipla de Permissões

```typescript
import { useModulePermissions } from '../hooks/usePermissions';

const OSManager: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const { hasPermission } = useModulePermissions(currentUser.role);

  // Verifica múltiplas permissões
  const canManageOS = hasPermission('os', 'edit');
  const canManageProjects = hasPermission('projects', 'view');
  const canManageInventory = hasPermission('inventory', 'edit');

  const showAdvancedOptions = canManageOS && canManageProjects && canManageInventory;

  return (
    <div>
      {/* Conteúdo básico */}
      <OSList />

      {/* Opções avançadas apenas para usuários com múltiplas permissões */}
      {showAdvancedOptions && (
        <div className="advanced-panel">
          <h3>Opções Avançadas</h3>
          <button onClick={linkToProject}>Vincular a Projeto</button>
          <button onClick={reserveMaterials}>Reservar Materiais</button>
        </div>
      )}
    </div>
  );
};
```

### 6. Renderização Condicional Complexa

```typescript
import { getModulePermissions } from '../services/permissions';

const Dashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const projectPerms = getModulePermissions(currentUser.role, 'projects');
  const inventoryPerms = getModulePermissions(currentUser.role, 'inventory');
  const reportPerms = getModulePermissions(currentUser.role, 'reports');

  return (
    <div className="dashboard">
      {/* Card de Projetos - apenas se pode visualizar */}
      {projectPerms.view && (
        <div className="widget">
          <h3>Projetos Ativos</h3>
          <ProjectSummary />
          {projectPerms.create && (
            <button>+ Novo Projeto</button>
          )}
        </div>
      )}

      {/* Card de Estoque - apenas se pode visualizar */}
      {inventoryPerms.view && (
        <div className="widget">
          <h3>Status do Estoque</h3>
          <InventorySummary />
          {inventoryPerms.export && (
            <button>Exportar Relatório</button>
          )}
        </div>
      )}

      {/* Relatórios - apenas se pode exportar */}
      {reportPerms.export && (
        <div className="widget">
          <h3>Relatórios Disponíveis</h3>
          <ReportsList />
        </div>
      )}
    </div>
  );
};
```

### 7. Filtro de Lista Baseado em Permissões

```typescript
import { canAccessModule } from '../services/permissions';

const NavigationMenu: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart-pie' },
    { id: 'projects', label: 'Projetos', icon: 'folder' },
    { id: 'os', label: 'OS', icon: 'wrench' },
    { id: 'inventory', label: 'Estoque', icon: 'warehouse' },
    { id: 'users', label: 'Usuários', icon: 'users' },
  ];

  // Filtra apenas os itens que o usuário pode acessar
  const allowedItems = menuItems.filter(item =>
    canAccessModule(currentUser.role, item.id as ModuleId)
  );

  return (
    <nav>
      {allowedItems.map(item => (
        <NavLink key={item.id} to={`/${item.id}`}>
          <i className={`fas fa-${item.icon}`}></i>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
```

### 8. Modal de Formulário com Permissões

```typescript
import { hasPermission } from '../services/permissions';

const MaterialFormModal: React.FC<Props> = ({ material, isEditing, currentUser }) => {
  const canEdit = hasPermission(currentUser.role, 'inventory', 'edit');
  const canDelete = hasPermission(currentUser.role, 'inventory', 'delete');

  // Se está editando mas não tem permissão, mostra apenas visualização
  if (isEditing && !canEdit) {
    return <MaterialViewOnlyModal material={material} />;
  }

  return (
    <Modal>
      <h2>{isEditing ? 'Editar' : 'Novo'} Material</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="description"
          defaultValue={material?.description}
          disabled={isEditing && !canEdit}
        />

        <div className="modal-footer">
          {canEdit && (
            <button type="submit">Salvar</button>
          )}

          {isEditing && canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-danger"
            >
              Excluir
            </button>
          )}

          <button type="button" onClick={closeModal}>
            {canEdit ? 'Cancelar' : 'Fechar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
```

### 9. Validação em Lote

```typescript
import { hasPermission } from '../services/permissions';

const BulkActions: React.FC<Props> = ({ selectedItems, currentUser }) => {
  const canEdit = hasPermission(currentUser.role, 'inventory', 'edit');
  const canDelete = hasPermission(currentUser.role, 'inventory', 'delete');
  const canExport = hasPermission(currentUser.role, 'inventory', 'export');

  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'edit':
        if (!canEdit) {
          alert('Sem permissão para editar materiais.');
          return;
        }
        bulkEdit(selectedItems);
        break;

      case 'delete':
        if (!canDelete) {
          alert('Sem permissão para excluir materiais.');
          return;
        }
        if (confirm(`Excluir ${selectedItems.length} materiais?`)) {
          bulkDelete(selectedItems);
        }
        break;

      case 'export':
        if (!canExport) {
          alert('Sem permissão para exportar.');
          return;
        }
        exportToExcel(selectedItems);
        break;
    }
  };

  return (
    <div className="bulk-actions">
      <span>{selectedItems.length} itens selecionados</span>

      {canEdit && (
        <button onClick={() => handleBulkAction('edit')}>
          Editar em Lote
        </button>
      )}

      {canDelete && (
        <button onClick={() => handleBulkAction('delete')}>
          Excluir Selecionados
        </button>
      )}

      {canExport && (
        <button onClick={() => handleBulkAction('export')}>
          Exportar Selecionados
        </button>
      )}
    </div>
  );
};
```

### 10. Dropdown de Ações Contextual

```typescript
import { hasPermission } from '../services/permissions';

const ActionDropdown: React.FC<Props> = ({ item, module, currentUser }) => {
  const actions = [
    {
      label: 'Visualizar',
      icon: 'eye',
      action: () => viewItem(item),
      permission: 'view'
    },
    {
      label: 'Editar',
      icon: 'edit',
      action: () => editItem(item),
      permission: 'edit'
    },
    {
      label: 'Duplicar',
      icon: 'copy',
      action: () => duplicateItem(item),
      permission: 'create'
    },
    {
      label: 'Excluir',
      icon: 'trash',
      action: () => deleteItem(item),
      permission: 'delete',
      danger: true
    }
  ];

  // Filtra apenas ações permitidas
  const allowedActions = actions.filter(action =>
    hasPermission(currentUser.role, module, action.permission as PermissionAction)
  );

  return (
    <DropdownMenu>
      {allowedActions.map(action => (
        <DropdownItem
          key={action.label}
          onClick={action.action}
          className={action.danger ? 'text-red-600' : ''}
        >
          <i className={`fas fa-${action.icon}`}></i>
          {action.label}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
};
```

## Considerações Importantes

1. **Sempre valide no backend**: Permissões de frontend são para UX, não para segurança
2. **Mantenha consistência**: Use os mesmos checks em toda a aplicação
3. **Feedback claro**: Informe o usuário quando uma ação não é permitida
4. **Performance**: Cache verificações de permissão quando possível
5. **Documentação**: Documente regras de negócio específicas relacionadas a permissões
