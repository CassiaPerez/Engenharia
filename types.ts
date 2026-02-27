// src/types.ts

export type UserRole = 'ADMIN' | 'MANAGER' | 'EXECUTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  photo?: string;
}

export type OSType = 'CORRECTIVE' | 'PREVENTIVE' | 'IMPROVEMENT';
export type OSStatus = 'OPEN' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELED';

export type Category = 'CONSTRUCTION' | 'MAINTENANCE' | 'IMPROVEMENT' | 'OTHER';

export type ProjectStatus = 'OPEN' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELED';

export type ServiceCostType = 'HOUR' | 'UNIT';

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
  code: string;
  name: string;
  description: string;
  location: string; // empresa
  sector?: string;
  parentEquipmentId?: string;
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

  // custo manual por projeto (auto + manual coexistem)
  manualMaterialCost?: number;
  manualServiceCost?: number;
  useManualMaterialCost?: boolean;
  useManualServiceCost?: boolean;
}

export interface ExecutorPauseEntry {
  timestamp: string;
  reason: string;
  userId: string;
  executorId: string;
  action: 'PAUSE' | 'RESUME';
  worklogBeforePause?: string;
}

export interface ExecutorState {
  status: 'IN_PROGRESS' | 'PAUSED' | 'DONE';
  startTime?: string;
  endTime?: string;
  pauseHistory?: ExecutorPauseEntry[];
  currentPauseReason?: string;
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

  executorStates?: Record<string, ExecutorState>;

  requesterId?: string;
  requesterName?: string;

  startTime?: string;
  endTime?: string;

  pauseReason?: string;
  pauseHistory?: { timestamp: string; reason: string; userId: string; action: 'PAUSE' | 'RESUME' }[];

  completionImage?: string;
  executionDescription?: string;

  materials: OSItem[];
  services: OSService[];

  manualMaterialCost?: number;
  manualServiceCost?: number;
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
  notes?: string;
}