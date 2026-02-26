/* eslint-disable @typescript-eslint/no-explicit-any */

export type UUID = string;

/**
 * Compatibilidade:
 * Seu ProjectList.tsx já espera existir export "Category".
 * Para não quebrar nada e não impor categorias fixas, deixei como string.
 * Se você já tiver categorias fixas no seu sistema, pode trocar para union.
 */
export type Category = string;

export type CompanyName =
  | "Cropbio"
  | "Cropfert Industria"
  | "Cropfert Jandaia"
  | "Cropfert do Brasil"
  | "Não informado";

export type PauseEventType = "PAUSE" | "RESUME";

export interface PauseEvent {
  id: UUID;
  type: PauseEventType;
  at: string; // ISO
  reason?: string;
  note?: string; // o que foi feito até antes da pausa (quando PAUSE)
  userId?: UUID;
  userName?: string;
}

export interface Execution {
  id: UUID;
  executorId: UUID;
  executorName: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO
  paused?: boolean;
  pauseHistory?: PauseEvent[];
}

export interface MaterialWithdrawal {
  id: UUID;
  createdAt: string; // ISO
  date: string; // ISO date/time (retirada)
  userId: UUID;
  userName: string;

  // relação
  osId?: UUID;
  osCode?: string;
  projectId?: UUID;
  projectName?: string;

  // item
  productId?: UUID;
  productCode?: string;
  productDescription: string;
  unit?: string;
  qty: number;

  // localização / custo
  location?: string;
  company?: CompanyName;

  observation?: string;

  // opcional (se existir no seu sistema)
  unitCost?: number;
}

export interface Equipment {
  id: UUID;
  code?: string;
  name: string;
  description?: string;

  // legado
  location?: string;

  // novo
  company?: CompanyName;
  sector?: string;
  parentEquipmentId?: UUID | null;
}

export interface Project {
  id: UUID;
  name: string;

  // compatibilidade com ProjectList (muito comum existir)
  category?: Category;

  location?: string; // usado como fallback p/ empresa/custo
  costCenter?: string;
}

export type OSStatus =
  | "Aberta"
  | "Em Execução"
  | "Pausada"
  | "Finalizada"
  | "Cancelada";

export interface OS {
  id: UUID;
  code: string;
  title: string;
  description?: string;

  status: OSStatus;

  createdAt: string; // ISO
  dueAt?: string; // ISO (prazo SLA)

  projectId?: UUID;
  projectName?: string;

  equipmentId?: UUID;
  equipmentName?: string;

  executors?: { id: UUID; name: string }[];

  // execuções (para relatório de horas / pausas)
  executions?: Execution[];

  // materiais vinculados à OS (quando retirados)
  withdrawals?: MaterialWithdrawal[];
}

export interface User {
  id: UUID;
  name: string;
  email?: string;
  role?: "admin" | "executor" | "viewer";
}

export interface EngineDB {
  os: OS[];
  projects: Project[];
  equipments: Equipment[];
  withdrawals: MaterialWithdrawal[];
  users: User[];
}

// helpers
export const COMPANY_OPTIONS: CompanyName[] = [
  "Cropbio",
  "Cropfert Industria",
  "Cropfert Jandaia",
  "Cropfert do Brasil",
  "Não informado",
];

export function inferCompanyFrom(
  equipment?: Equipment,
  project?: Project
): CompanyName {
  if (equipment?.company && equipment.company !== "Não informado") return equipment.company;

  const loc = (equipment?.location || project?.location || "").toLowerCase();
  if (!loc) return "Não informado";
  if (loc.includes("cropbio")) return "Cropbio";
  if (loc.includes("industria") || loc.includes("indústria")) return "Cropfert Industria";
  if (loc.includes("jandaia")) return "Cropfert Jandaia";
  if (loc.includes("brasil")) return "Cropfert do Brasil";
  return "Não informado";
}

export function isOverdue(os: OS, now = new Date()): boolean {
  if (!os.dueAt) return false;
  const due = new Date(os.dueAt);
  return (
    due.getTime() < now.getTime() &&
    os.status !== "Finalizada" &&
    os.status !== "Cancelada"
  );
}

export function sortByMostRecentOpened(a: OS, b: OS): number {
  const da = new Date(a.createdAt).getTime();
  const db = new Date(b.createdAt).getTime();
  return db - da;
}

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

export function msToHours(ms: number): number {
  return Math.max(0, ms) / 1000 / 60 / 60;
}

/**
 * Calcula horas efetivas da OS:
 * - soma execuções (endedAt - startedAt)
 * - desconta pausas (PAUSE->RESUME)
 * Observação: se endedAt não existir, usa "agora".
 */
export function calcEffectiveHoursForOS(os: OS, now = new Date()): number {
  const executions = os.executions || [];
  let totalMs = 0;

  for (const ex of executions) {
    const start = new Date(ex.startedAt).getTime();
    const end = new Date(ex.endedAt || now.toISOString()).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;

    let exMs = end - start;

    const ph = ex.pauseHistory || [];
    const sorted = [...ph].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );

    let pauseStart: number | null = null;
    for (const ev of sorted) {
      const t = new Date(ev.at).getTime();
      if (Number.isNaN(t)) continue;

      if (ev.type === "PAUSE") {
        pauseStart = t;
      } else if (ev.type === "RESUME" && pauseStart != null) {
        const pauseEnd = t;
        if (pauseEnd > pauseStart) exMs -= pauseEnd - pauseStart;
        pauseStart = null;
      }
    }

    if (pauseStart != null) {
      const pauseEnd = end;
      if (pauseEnd > pauseStart) exMs -= pauseEnd - pauseStart;
    }

    totalMs += Math.max(0, exMs);
  }

  return msToHours(totalMs);
}

export interface ReportPeriod {
  from: string; // ISO date (YYYY-MM-DD)
  to: string;   // ISO date (YYYY-MM-DD)
}

export function normalizePeriod(period: ReportPeriod): ReportPeriod {
  const from = new Date(period.from);
  const to = new Date(period.to);
  if (to.getTime() < from.getTime()) return { from: period.to, to: period.from };
  return period;
}

export function inPeriod(iso: string, period: ReportPeriod): boolean {
  const p = normalizePeriod(period);
  const t = new Date(iso).getTime();
  const a = new Date(p.from).getTime();
  const b = new Date(p.to).getTime();
  if ([t, a, b].some(Number.isNaN)) return false;
  const end = b + 24 * 60 * 60 * 1000 - 1;
  return t >= a && t <= end;
}

export function safeText(v: any): string {
  if (v == null) return "";
  return String(v);
}