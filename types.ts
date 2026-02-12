
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
  IMPROVEMENT = 'Melhoria',
  OPERATION_SUPPORT = 'Auxiliar de operação'
}

export enum ServiceCostType {
  HOURLY = 'Por Hora',
  FIXED = 'Valor Fixo'
}

export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  manager: string;
  type: 'CORPORATE' | 'INDUSTRIAL' | 'LOGISTICS';
  notes?: string;
}

export interface Equipment {
  id: string;
  code: string;     // TAG do equipamento
  name: string;
  description: string;
  location: string; // Empresa proprietária
  model: string;
  serialNumber: string;
  manufacturer: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  purchaseDate?: string;
  notes?: string;
}

export interface StockLocation {
  name: string;
  quantity: number;
}

export interface Material {
  id: string;
  code: string;
  description: string;
  group: string;
  unit: string;
  unitCost: number;
  minStock: number;
  currentStock: number; // Soma total de todos os locais
  location: string; // Local principal/padrão (display)
  stockLocations?: StockLocation[]; // Detalhamento por local
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  team: string; /* Time/Equipe responsável */
  costType: ServiceCostType;
  unitValue: number;
  category: 'INTERNAL' | 'EXTERNAL';
}

export interface PlannedMaterial {
  materialId: string;
  quantity: number;
  unitCost: number;
}

export interface PlannedService {
  serviceTypeId: string;
  hours: number;
  unitCost: number;
}

export interface Project {
  id: string;
  code: string;
  description: string;
  detailedDescription: string;
  location: string;
  city: string;
  category: Category;
  reason: string;
  reasonType: OSType;
  responsible: string;
  area: string;
  costCenter: string;
  estimatedValue: number;
  plannedMaterials: PlannedMaterial[];
  plannedServices: PlannedService[];
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
  projectId?: string;
  buildingId?: string;
  equipmentId?: string;
  description: string;
  type: OSType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  slaHours: number;
  openDate: string;
  limitDate: string;
  status: OSStatus;
  executorIds?: string[];
  executorId?: string;
  startTime?: string;
  endTime?: string;
  pauseReason?: string;
  pauseHistory?: { timestamp: string; reason: string; userId: string; action: 'PAUSE' | 'RESUME' }[];
  completionImage?: string;
  executionDescription?: string;
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
  type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN' | 'TRANSFER';
  materialId: string;
  quantity: number;
  date: string;
  userId: string;
  osId?: string;
  projectId?: string; // Para baixa direta em projeto
  description: string;
  fromLocation?: string; // Para transferências e saídas
  toLocation?: string;   // Para transferências e entradas
}

export interface SupplierDoc {
  name: string;
  url: string; /* Base64 ou URL */
  type: string;
  uploadDate: string;
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
  status: 'PENDING' | 'HOMOLOGATED' | 'BLOCKED';
  docs: SupplierDoc[];
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

// User Role Definitions
// WAREHOUSE: Almoxarife Geral (Supervisor)
// WAREHOUSE_BIO: Almoxarife Unidade CropBio
// WAREHOUSE_FERT: Almoxarife Unidade CropFert
// COORDINATOR: Coordenador (repassa serviços para executores e cadastra equipamentos)
export type UserRole = 'ADMIN' | 'MANAGER' | 'COORDINATOR' | 'EXECUTOR' | 'USER' | 'WAREHOUSE' | 'WAREHOUSE_BIO' | 'WAREHOUSE_FERT';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; 
  role: UserRole;
  department?: string;
  active: boolean;
  avatar?: string;
}
