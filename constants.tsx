
import { Material, ServiceType, Project, ProjectStatus, Category, OSType, ServiceCostType } from './types';

export const INITIAL_MATERIALS: Material[] = [
  // Fixed: Added missing 'group' property to Material objects
  { id: 'm1', code: 'CIM-001', description: 'Cimento CP-II 50kg', group: 'Construção', unit: 'Saco', unitCost: 32.5, minStock: 20, currentStock: 45, location: 'Ala A-01', status: 'ACTIVE' },
  { id: 'm2', code: 'ACO-010', description: 'Barra de Aço 10mm', group: 'Metalurgia', unit: 'Barra', unitCost: 45.9, minStock: 50, currentStock: 120, location: 'Ala B-05', status: 'ACTIVE' },
  { id: 'm3', code: 'TUB-075', description: 'Tubo PVC 75mm 6m', group: 'Hidráulica', unit: 'Un', unitCost: 89.0, minStock: 10, currentStock: 8, location: 'Ala C-02', status: 'ACTIVE' },
];

export const INITIAL_SERVICES: ServiceType[] = [
  // Fixed: Added missing 'category' property to ServiceType objects
  { id: 's1', name: 'Alvenaria', description: 'Levantamento de paredes e reboco', costType: ServiceCostType.HOURLY, unitValue: 45.0, category: 'INTERNAL' },
  { id: 's2', name: 'Elétrica', description: 'Instalações elétricas prediais', costType: ServiceCostType.HOURLY, unitValue: 65.0, category: 'EXTERNAL' },
  { id: 's3', name: 'Hidráulica', description: 'Instalações de tubulações e esgoto', costType: ServiceCostType.HOURLY, unitValue: 60.0, category: 'INTERNAL' },
  { id: 's4', name: 'Laudo Técnico', description: 'Emissão de ART e vistoria', costType: ServiceCostType.FIXED, unitValue: 850.0, category: 'EXTERNAL' },
];

export const INITIAL_PROJECTS: Project[] = [
  { 
    id: 'p1', 
    code: 'PRJ-2024-001', 
    description: 'Reforma Galpão Sul', 
    category: Category.WORK, 
    reason: 'Manutenção estrutural telhado', 
    reasonType: OSType.PREVENTIVE, 
    responsible: 'Eng. Ricardo Silva', 
    // Fixed: Added missing area, costCenter and auditLogs properties
    area: 'Logística',
    costCenter: 'CC-MANUT-001',
    estimatedValue: 150000, 
    startDate: '2024-01-15', 
    estimatedEndDate: '2024-06-15', 
    slaDays: 150, 
    status: ProjectStatus.IN_PROGRESS, 
    postponementHistory: [],
    auditLogs: [{ date: '2024-01-15T10:00:00Z', action: 'Início do Projeto', user: 'Ricardo Silva' }]
  }
];