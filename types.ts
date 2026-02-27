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
  code: string;     // TAG do equipamento
  name: string;
  description: string;
  location: string; // Empresa proprietária
  sector?: string;  // Setor (para árvore de bens)
  parentEquipmentId?: string; // Equipamento pai (hierarquia)
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

  // =========================
  // CUSTO MANUAL DO PROJETO
  // =========================
  // Valores digitados (manual)
  manualMaterialCost?: number;
  manualServiceCost?: number;

  // Flags para escolher o cálculo efetivo:
  // true = usar manual, false/undefined = usar automático (baixa automática via OS)
  useManualMaterialCost?: boolean;
  useManualServiceCost?: boolean;
}

export interface ExecutorPauseEntry {
  timestamp: string;
  reason: string;
  userId: string; // quem registrou a ação
  executorId: string; // para qual executor vale
  action: 'PAUSE' | 'RESUME';
  worklogBeforePause?: string; // o que foi feito até antes da pausa
}

export interface ExecutorState {
  status: 'IN_PROGRESS' | 'PAUSED' | 'DONE';
  startTime?: string;
  endTime?: string;
  pauseHistory?: ExecutorPauseEntry[];
  currentPauseReason?: string;
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
  projectId?: string; // Para baixa direta em projeto
  costCenter?: string; // Centro de custo da OS ou Projeto
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
  notes?: string;
}