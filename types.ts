/* eslint-disable @typescript-eslint/no-explicit-any */

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

export type CompanyName =
  | "Cropbio"
  | "Cropfert Industria"
  | "Cropfert Jandaia"
  | "Cropfert do Brasil"
  | "Não informado";

export const COMPANY_OPTIONS: CompanyName[] = [
  "Cropbio",
  "Cropfert Industria",
  "Cropfert Jandaia",
  "Cropfert do Brasil",
  "Não informado",
];

export interface Equipment {
  id: string;
  code: string;     // TAG do equipamento
  name: string;
  description: string;
  location: string; // Empresa proprietária (LEGADO)
  model: string;
  serialNumber: string;
  manufacturer: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  purchaseDate?: string;
  notes?: string;

  // NOVOS CAMPOS (opcionais, não quebram legado)
  company?: CompanyName | string;
  sector?: string;
  parentEquipmentId?: string;
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

  // MELHORIA compatível
  pauseHistory?: {
    timestamp: string;
    reason: string;
    note?: string;
    userId: string;
    userName?: string;
    action: 'PAUSE' | 'RESUME';
  }[];

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
  userName?: string;

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

export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'COORDINATOR'
  | 'EXECUTOR'
  | 'USER'
  | 'WAREHOUSE'
  | 'WAREHOUSE_BIO'
  | 'WAREHOUSE_FERT';

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

/* =========================
   HELPERS (pra não dar tela branca)
   ========================= */

export function formatDateBR(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTimeBR(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export interface ReportPeriod {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export function inPeriod(iso: string, period: ReportPeriod): boolean {
  const a = new Date(period.from).getTime();
  const b = new Date(period.to).getTime();
  const t = new Date(iso).getTime();
  if ([a, b, t].some(Number.isNaN)) return false;
  const end = b + 24 * 60 * 60 * 1000 - 1;
  return t >= a && t <= end;
}

/** Inferência de empresa (compatível com legado: usa Equipment.location / Project.location) */
export function inferCompanyFrom(equipment?: Partial<Equipment>, project?: Partial<Project>): CompanyName {
  const c = (equipment as any)?.company as string | undefined;
  if (c && COMPANY_OPTIONS.includes(c as CompanyName) && c !== "Não informado") return c as CompanyName;

  const loc = String((equipment as any)?.location || (project as any)?.location || "").toLowerCase();
  if (!loc) return "Não informado";
  if (loc.includes("cropbio")) return "Cropbio";
  if (loc.includes("industria") || loc.includes("indústria")) return "Cropfert Industria";
  if (loc.includes("jandaia")) return "Cropfert Jandaia";
  if (loc.includes("brasil")) return "Cropfert do Brasil";
  return "Não informado";
}

/** SLA atrasado (usa OS.limitDate) */
export function isOverdue(os: OS, now = new Date()): boolean {
  const due = new Date(os.limitDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime() && os.status !== OSStatus.COMPLETED && os.status !== OSStatus.CANCELED;
}

/** Ordenar por mais recente aberta (usa OS.openDate) */
export function sortByMostRecentOpened(a: OS, b: OS): number {
  const da = new Date(a.openDate).getTime();
  const db = new Date(b.openDate).getTime();
  return db - da;
}

/** Horas efetivas (usa startTime/endTime e desconta pausas de pauseHistory) */
export function calcEffectiveHoursForOS(os: OS, now = new Date()): number {
  const start = new Date(os.startTime || os.openDate).getTime();
  const end = new Date(os.endTime || now.toISOString()).getTime();
  if ([start, end].some(Number.isNaN) || end <= start) return 0;

  let ms = end - start;

  const ph = (os.pauseHistory || [])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let pauseStart: number | null = null;
  for (const ev of ph) {
    const t = new Date(ev.timestamp).getTime();
    if (Number.isNaN(t)) continue;

    if (ev.action === "PAUSE") pauseStart = t;
    if (ev.action === "RESUME" && pauseStart != null) {
      if (t > pauseStart) ms -= (t - pauseStart);
      pauseStart = null;
    }
  }

  if (pauseStart != null) {
    if (end > pauseStart) ms -= (end - pauseStart);
  }

  return Math.max(0, ms) / 1000 / 60 / 60;
}