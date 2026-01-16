
export enum ProjectStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED'
}

export enum OSStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export enum Category {
  WORK = 'Obra',
  MAINTENANCE = 'Manutenção',
  IMPROVEMENT = 'Melhoria',
  LEGAL = 'Adequação Legal',
  ENGINEERING = 'Engenharia'
}

export enum OSType {
  CORRECTIVE = 'Corretiva',
  PREVENTIVE = 'Preventiva',
  PREDICTIVE = 'Preditiva',
  LEGAL = 'Legal',
  IMPROVEMENT = 'Melhoria'
}

export enum ServiceCostType {
  HOURLY = 'Por Hora',
  FIXED = 'Valor Fixo'
}

export interface Material {
  id: string;
  code: string;
  description: string;
  group: string;
  unit: string;
  unitCost: number;
  minStock: number;
  currentStock: number;
  location: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  costType: ServiceCostType;
  unitValue: number; /* Mantido como referência de custo interno se necessário, mas oculto na UI */
  category: 'INTERNAL' | 'EXTERNAL';
}

export interface PlannedMaterial {
  materialId: string;
  quantity: number;
}

export interface PlannedService {
  serviceTypeId: string;
  hours: number;
}

export interface Project {
  id: string;
  code: string;
  description: string; /* Título curto */
  detailedDescription: string; /* Escopo detalhado */
  location: string; /* Prédio/Setor */
  city: string; /* Cidade/UF */
  category: Category;
  reason: string;
  reasonType: OSType;
  responsible: string;
  area: string;
  costCenter: string;
  estimatedValue: number; /* Orçamento monetário macro */
  plannedMaterials: PlannedMaterial[]; /* Planejamento físico de materiais */
  plannedServices: PlannedService[]; /* Planejamento físico de horas */
  startDate: string;
  estimatedEndDate: string;
  slaDays: number;
  status: ProjectStatus;
  postponementHistory: { date: string; justification: string; user: string }[];
  auditLogs: { date: string; action: string; user: string }[];
}

export interface OS {
  id: string;
  number: string;
  projectId: string;
  description: string;
  type: OSType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  slaHours: number;
  openDate: string;
  limitDate: string;
  status: OSStatus;
  executorId?: string;
  startTime?: string;
  endTime?: string;
  pauseReason?: string;
  materials: OSItem[];
  services: OSService[];
}

export interface OSItem {
  materialId: string;
  quantity: number;
  unitCost: number;
  timestamp: string;
}

export interface OSService {
  serviceTypeId: string;
  quantity: number;
  unitCost: number;
  timestamp: string;
}

export interface StockMovement {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN';
  materialId: string;
  quantity: number;
  date: string;
  userId: string;
  osId?: string;
  description: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  notes: string;
  categoryIds: string[];
}

export interface PurchaseRecord {
  id: string;
  supplierId: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  date: string;
  invoiceNumber: string;
}

export type UserRole = 'ADMIN' | 'ENGINEERING' | 'EXECUTOR' | 'STOCK' | 'MANAGER';
