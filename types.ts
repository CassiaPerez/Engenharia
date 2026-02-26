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
  FIXED = 'Valor Fixo',
  VARIABLE = 'Valor Variável'
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

// ✅ NOVO: Tipo das empresas do grupo para Árvore de Bens
export type CompanyName = 'Cropbio' | 'Cropfert Industria' | 'Cropfert Jandaia' | 'Cropfert do Brasil';

export interface Equipment {
  id: string;
  code: string;        // TAG do equipamento
  name: string;
  description: string;
  location: string;    // Local físico do equipamento
  model: string;
  serialNumber: string;
  manufacturer: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  purchaseDate?: string;
  notes?: string;
  // ✅ NOVOS campos para Árvore de Bens (retrocompatíveis - opcionais)
  company?: CompanyName | string;  // Empresa proprietária
  sector?: string;                  // Setor dentro da empresa
  buildingId?: string;              // Vínculo com prédio/unidade
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
  currentStock: number;
  location: string;
  stockLocations?: StockLocation[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  team: string;
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
  manualMaterialCost?: number;
  manualServiceCost?: number;
}

// ✅ NOVO: Interface tipada para entradas no histórico de pausas
export interface PauseEntry {
  timestamp: string;             // ISO datetime da ação
  reason: string;                // Motivo da pausa ou texto de início/retomada
  workDoneDescription?: string;  // O que foi feito até o momento da pausa (opcional)
  userId: string;
  action: 'PAUSE' | 'RESUME';
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
  costCenter?: string;
  executorIds?: string[];
  executorId?: string;
  requesterId?: string;
  requesterName?: string;
  startTime?: string;
  endTime?: string;
  pauseReason?: string;
  // ✅ ATUALIZADO: usa PauseEntry tipado (retrocompatível com dados antigos)
  pauseHistory?: PauseEntry[];
  completionImage?: string;
  executionDescription?: string;
  materials: OSItem[];
  services: OSService[];
  manualMaterialCost?: number;
  manualServiceCost?: number;
}

export interface OSItem {
  materialId: string;
  quantity: number;
  unitCost: number;
  timestamp: string;
  fromLocation?: string;
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
  projectId?: string;
  costCenter?: string;
  description: string;
  fromLocation?: string;
  toLocation?: string;
}

export interface SupplierDoc {
  name: string;
  url: string;
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

export type UserRole = 'ADMIN' | 'MANAGER' | 'COORDINATOR' | 'EXECUTOR' | 'USER' | 'WAREHOUSE' | 'WAREHOUSE_BIO' | 'WAREHOUSE_FERT';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  company?: string;
  active: boolean;
  avatar?: string;
}