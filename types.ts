
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
// ADMIN: Acesso Total
// MANAGER: Gestão (Sem criar usuários)
// EXECUTOR: Prestador de Serviço (Foco Operacional)
// USER: Usuário Comum (Visualização)
export type UserRole = 'ADMIN' | 'MANAGER' | 'EXECUTOR' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Em produção, usar hash ou Auth Provider externo
  role: UserRole;
  department?: string;
  active: boolean;
  avatar?: string;
}
