
import { Material, ServiceType, Project, ProjectStatus, Category, OSType, ServiceCostType, User, Building } from './types';

export const INITIAL_MATERIALS: Material[] = [
  // ELÉTRICA & AUTOMAÇÃO (Amostra Principal)
  { id: 'P0584', code: 'P0584', description: 'DISJUNTOR DIM WEG 1 X 10 CURVA C', group: 'Elétrica', unit: 'Un', unitCost: 10.98, minStock: 5, currentStock: 11, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 11}], status: 'ACTIVE' },
  { id: 'P0523', code: 'P0523', description: 'DISJUNTOR DIM WEG 1 X 16 CURVA C', group: 'Elétrica', unit: 'Un', unitCost: 10.98, minStock: 5, currentStock: 3, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 3}], status: 'ACTIVE' },
  { id: 'P0564', code: 'P0564', description: 'DISJUNTOR DIM WEG 1 X 25 CURVA C', group: 'Elétrica', unit: 'Un', unitCost: 10.98, minStock: 5, currentStock: 3, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 3}], status: 'ACTIVE' },
  { id: '1011133', code: '1011133', description: 'DISJUNTOR MOTOR INNOV 3RV20219.00 A 12.5', group: 'Elétrica', unit: 'Un', unitCost: 464.24, minStock: 2, currentStock: 2, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 2}], status: 'ACTIVE' },
  { id: '1010830', code: '1010830', description: 'SENSOR CAPACITIVO CR18 5DN3 NPN FACEADO 4 FIOS 6 36V', group: 'Automação', unit: 'Un', unitCost: 372.30, minStock: 1, currentStock: 1, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 1}], status: 'ACTIVE' },
  { id: '2609', code: '2609', description: 'BOTÃO DUPLO ILUMINADO M20IDL-Y-1C METALTEX', group: 'Automação', unit: 'Un', unitCost: 66.22, minStock: 5, currentStock: 7, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 7}], status: 'ACTIVE' },
  { id: '1011541', code: '1011541', description: 'BOTÃO METALTEX IMPULSO 22.0 MMM VERDE 1NA', group: 'Automação', unit: 'Un', unitCost: 24.02, minStock: 5, currentStock: 10, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 10}], status: 'ACTIVE' },
  { id: 'P0738', code: 'P0738', description: 'CABO AUTO FLEXIVEL 0.75MM PRETO', group: 'Elétrica', unit: 'Un', unitCost: 1.02, minStock: 50, currentStock: 200, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 200}], status: 'ACTIVE' },
  { id: 'P0859', code: 'P0859', description: 'CABO P.P. 3 X 2.50', group: 'Elétrica', unit: 'Un', unitCost: 10.24, minStock: 20, currentStock: 100, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 100}], status: 'ACTIVE' },
  
  // HIDRÁULICA & PNEUMÁTICA
  { id: '1011410', code: '1011410', description: 'VÁLVULA SOLENOIDE 5/2 VIAS 1/4 24A', group: 'Pneumática', unit: 'Un', unitCost: 469.50, minStock: 1, currentStock: 1, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 1}], status: 'ACTIVE' },
  { id: 'P0021', code: 'P0021', description: 'PPR LUVA SIMPLES F/F 90 MM AMANCO 14575', group: 'Hidráulica', unit: 'Un', unitCost: 63.00, minStock: 2, currentStock: 18, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 18}], status: 'ACTIVE' },
  { id: '1009660', code: '1009660', description: 'VÁLVULA ESF TRIOP TOTAL INOX 304PPTR 300LBS 1.1/2" MGA', group: 'Hidráulica', unit: 'Un', unitCost: 470.00, minStock: 1, currentStock: 3, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 3}], status: 'ACTIVE' },
  
  // MECÂNICA & FIXAÇÃO
  { id: 'P0222', code: 'P0222', description: 'ROLAMENTO 6203 NSK', group: 'Mecânica', unit: 'Un', unitCost: 17.48, minStock: 2, currentStock: 4, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 4}], status: 'ACTIVE' },
  { id: '3118', code: '3118', description: 'CORREIA INDUSTRIAL A-46 GATES HI POWER II', group: 'Mecânica', unit: 'Un', unitCost: 15.00, minStock: 1, currentStock: 2, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 2}], status: 'ACTIVE' },
  { id: 'P0317', code: 'P0317', description: 'ABRAÇADEIRA DE NYLON A 2.5 X 100 BRANCA', group: 'Fixação', unit: 'Un', unitCost: 0.08, minStock: 50, currentStock: 3, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 3}], status: 'ACTIVE' },
  
  // CONSUMÍVEIS & EPI
  { id: '2613', code: '2613', description: 'FITA ISOLANTE 19MM X 20M COMUM P22', group: 'Consumíveis', unit: 'Un', unitCost: 8.22, minStock: 5, currentStock: 13, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 13}], status: 'ACTIVE' },
  { id: '1007275', code: '1007275', description: 'DESENGRIPANTE ANTI-FERRUGEM DW40 MULTIUSO', group: 'Consumíveis', unit: 'Un', unitCost: 43.43, minStock: 2, currentStock: 7, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 7}], status: 'ACTIVE' },
  { id: 'P0724', code: 'P0724', description: 'LENTE ACRILICA INCOLOR PQ 105X55X1.0MM ESAB A40', group: 'Consumíveis', unit: 'Un', unitCost: 4.50, minStock: 5, currentStock: 13, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 13}], status: 'ACTIVE' },
  
  // SOLDA & FERRAMENTAS
  { id: 'P0113', code: 'P0113', description: 'VARETA INÓX 308-L 1,60 MM (PROBUS 1008422)', group: 'Solda', unit: 'Un', unitCost: 70.37, minStock: 20, currentStock: 140, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 140}], status: 'ACTIVE' },
  { id: '1010951', code: '1010951', description: 'FERRAMENTA ALICATE UNIVERSAL 8 GEDORE RD 2830', group: 'Ferramentas', unit: 'Un', unitCost: 47.35, minStock: 1, currentStock: 1, location: 'Jandaia', stockLocations: [{name: 'Jandaia', quantity: 1}], status: 'ACTIVE' }
];

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
