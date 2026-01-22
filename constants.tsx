
import { Material, ServiceType, Project, ProjectStatus, Category, OSType, ServiceCostType, User, Building } from './types';

export const INITIAL_MATERIALS: Material[] = [
  { id: 'm1', code: 'CIM-001', description: 'Cimento CP-II 50kg', group: 'Construção', unit: 'Saco', unitCost: 32.5, minStock: 20, currentStock: 45, location: 'Ala A-01', status: 'ACTIVE' },
  { id: 'm2', code: 'ACO-010', description: 'Barra de Aço 10mm', group: 'Metalurgia', unit: 'Barra', unitCost: 45.9, minStock: 50, currentStock: 120, location: 'Ala B-05', status: 'ACTIVE' },
  { id: 'm3', code: 'TUB-075', description: 'Tubo PVC 75mm 6m', group: 'Hidráulica', unit: 'Un', unitCost: 89.0, minStock: 10, currentStock: 8, location: 'Ala C-02', status: 'ACTIVE' },
];

export const INITIAL_SERVICES: ServiceType[] = [
  { id: 's1', name: 'Alvenaria', description: 'Levantamento de paredes e reboco', team: 'Equipe Civil A', costType: ServiceCostType.HOURLY, unitValue: 50, category: 'INTERNAL' },
  { id: 's2', name: 'Elétrica', description: 'Instalações elétricas prediais', team: 'Manutenção Elétrica', costType: ServiceCostType.HOURLY, unitValue: 80, category: 'INTERNAL' },
  { id: 's3', name: 'Hidráulica', description: 'Instalações de tubulações e esgoto', team: 'Manutenção Hidráulica', costType: ServiceCostType.HOURLY, unitValue: 75, category: 'INTERNAL' },
  { id: 's4', name: 'Vistoria Técnica', description: 'Laudo de conformidade técnica', team: 'Engenharia e Qualidade', costType: ServiceCostType.FIXED, unitValue: 250, category: 'INTERNAL' },
];

export const INITIAL_PROJECTS: Project[] = [
  { 
    id: 'p1', 
    code: 'PRJ-2024-001', 
    description: 'Reforma Galpão Sul',
    detailedDescription: 'Substituição integral da cobertura metálica, aplicação de manta térmica e revisão de todo o sistema elétrico de iluminação.',
    location: 'Galpão Logístico G01',
    city: 'Jundiaí - SP',
    category: Category.WORK, 
    reason: 'Manutenção estrutural telhado', 
    reasonType: OSType.PREVENTIVE, 
    responsible: 'Eng. Ricardo Silva', 
    area: 'Logística',
    costCenter: 'CC-MANUT-001',
    estimatedValue: 150000, 
    /* Planejamento Físico Inicial */
    plannedMaterials: [
        { materialId: 'm1', quantity: 50, unitCost: 32.5 },
        { materialId: 'm2', quantity: 20, unitCost: 45.9 }
    ],
    plannedServices: [
        { serviceTypeId: 's1', hours: 120, unitCost: 50 },
        { serviceTypeId: 's4', hours: 8, unitCost: 250 }
    ],
    startDate: '2024-01-15', 
    estimatedEndDate: '2024-06-15', 
    slaDays: 150, 
    status: ProjectStatus.IN_PROGRESS, 
    postponementHistory: [],
    auditLogs: [{ date: '2024-01-15T10:00:00Z', action: 'Início do Projeto', user: 'Ricardo Silva' }]
  }
];

export const INITIAL_BUILDINGS: Building[] = [
  {
    id: 'b1',
    name: 'Sede Administrativa',
    address: 'Av. Paulista, 1000',
    city: 'São Paulo - SP',
    manager: 'Carlos Eduardo',
    type: 'CORPORATE',
    notes: 'Edifício principal com 15 andares.'
  },
  {
    id: 'b2',
    name: 'CD Cajamar',
    address: 'Rod. Anhanguera, km 30',
    city: 'Cajamar - SP',
    manager: 'Roberto Dias',
    type: 'LOGISTICS',
    notes: 'Centro de distribuição principal.'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    name: 'Administrador Principal',
    email: 'admin@crop.com',
    password: '123', // Demo
    role: 'ADMIN',
    department: 'Diretoria Técnica',
    active: true,
    avatar: 'AD'
  },
  {
    id: 'prestador',
    name: 'Prestador Teste',
    email: 'prestador@crop.com',
    password: '123',
    role: 'EXECUTOR',
    department: 'Manutenção de Campo',
    active: true,
    avatar: 'PT'
  }
];
