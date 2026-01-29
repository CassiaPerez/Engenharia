
import { Material, ServiceType, Project, ProjectStatus, Category, OSType, ServiceCostType, User, Building } from './types';

// Lista inicial vazia para permitir o cadastro/importação dos itens corretos
export const INITIAL_MATERIALS: Material[] = [];

export const INITIAL_SERVICES: ServiceType[] = [
  { id: 'SRV-001', name: 'Manutenção Elétrica', description: 'Serviços de reparo e instalação elétrica geral', team: 'Manutenção', costType: ServiceCostType.HOURLY, unitValue: 120.00, category: 'INTERNAL' },
  { id: 'SRV-002', name: 'Manutenção Mecânica', description: 'Reparos em maquinário e equipamentos', team: 'Manutenção', costType: ServiceCostType.HOURLY, unitValue: 150.00, category: 'INTERNAL' },
  { id: 'SRV-003', name: 'Pintura Industrial', description: 'Pintura de estruturas metálicas e pisos', team: 'Obras', costType: ServiceCostType.HOURLY, unitValue: 90.00, category: 'EXTERNAL' },
  { id: 'SRV-004', name: 'Instalação Hidráulica', description: 'Manutenção de redes de água e esgoto', team: 'Civil', costType: ServiceCostType.HOURLY, unitValue: 110.00, category: 'INTERNAL' },
  { id: 'SRV-005', name: 'Automação Industrial', description: 'Programação de CLP e parametrização de inversores', team: 'Engenharia', costType: ServiceCostType.HOURLY, unitValue: 200.00, category: 'INTERNAL' }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PRJ-2024-001',
    code: 'PRJ-24-001',
    description: 'Expansão da Linha de Montagem C',
    detailedDescription: 'Projeto para aumentar a capacidade produtiva da linha C, incluindo nova esteira e robôs de solda.',
    location: 'Galpão Principal',
    city: 'Jandaia',
    category: Category.IMPROVEMENT,
    reason: 'Aumento de demanda',
    reasonType: OSType.IMPROVEMENT,
    responsible: 'Eng. Carlos Souza',
    area: 'Produção',
    costCenter: 'CC-1020',
    estimatedValue: 450000.00,
    plannedMaterials: [],
    plannedServices: [],
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    slaDays: 90,
    status: ProjectStatus.IN_PROGRESS,
    postponementHistory: [],
    auditLogs: []
  },
  {
    id: 'PRJ-2024-002',
    code: 'PRJ-24-002',
    description: 'Adequação NR-12 Prensas',
    detailedDescription: 'Instalação de barreiras de luz e relés de segurança nas prensas hidráulicas do setor de estamparia.',
    location: 'Setor de Estamparia',
    city: 'Jandaia',
    category: Category.LEGAL,
    reason: 'Conformidade Legal',
    reasonType: OSType.LEGAL,
    responsible: 'Tec. Segurança Ana Lima',
    area: 'Segurança do Trabalho',
    costCenter: 'CC-3050',
    estimatedValue: 85000.00,
    plannedMaterials: [],
    plannedServices: [],
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    slaDays: 45,
    status: ProjectStatus.PLANNED,
    postponementHistory: [],
    auditLogs: []
  }
];

export const INITIAL_USERS: User[] = [
  { id: 'U001', name: 'Administrador', email: 'admin@crop.com', password: '123', role: 'ADMIN', active: true, department: 'TI' },
  { id: 'U002', name: 'Gerente de Planta', email: 'gerente@crop.com', password: '123', role: 'MANAGER', active: true, department: 'Industrial' },
  { id: 'U003', name: 'Técnico Executor', email: 'tecnico@crop.com', password: '123', role: 'EXECUTOR', active: true, department: 'Manutenção' },
  { id: 'U004', name: 'Usuário Comum', email: 'user@crop.com', password: '123', role: 'USER', active: true, department: 'PCP' }
];

export const INITIAL_BUILDINGS: Building[] = [
  { id: 'BLD-001', name: 'Planta Industrial Jandaia', address: 'Rodovia BR-376, km 200', city: 'Jandaia do Sul', manager: 'Roberto Almeida', type: 'INDUSTRIAL', notes: 'Unidade fabril principal.' },
  { id: 'BLD-002', name: 'Centro de Distribuição', address: 'Av. das Indústrias, 500', city: 'Maringá', manager: 'Fernanda Costa', type: 'LOGISTICS', notes: 'Armazenagem de produto acabado.' },
  { id: 'BLD-003', name: 'Escritório Corporativo', address: 'Rua Santos Dumont, 1200', city: 'Maringá', manager: 'Juliana Silva', type: 'CORPORATE', notes: 'Sede administrativa e RH.' }
];
