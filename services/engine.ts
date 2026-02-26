import {
  EngineDB,
  Equipment,
  MaterialWithdrawal,
  OS,
  PauseEvent,
  Project,
  User,
} from "../types";

const LS_KEY = "engine_db_v1";

function uuid(): string {
  // uuid simples suficiente para storage local
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowISO(): string {
  return new Date().toISOString();
}

function defaultDB(): EngineDB {
  return {
    os: [],
    projects: [],
    equipments: [],
    withdrawals: [],
    users: [],
  };
}

/**
 * ✅ NOVO EXPORT (compatível)
 * Dashboard.tsx precisa disso.
 *
 * Calcula custos do projeto (modelo):
 * - materialCost: soma plannedMaterials (qty * unitCost) OU manualMaterialCost
 * - serviceCost: soma plannedServices (hours * unitCost) OU manualServiceCost
 * - totalCost: materialCost + serviceCost
 */
export function calculateProjectCosts(project: Project): {
  materialCost: number;
  serviceCost: number;
  totalCost: number;
} {
  const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  let materialCost = 0;
  let serviceCost = 0;

  // plannedMaterials
  if (Array.isArray((project as any).plannedMaterials)) {
    for (const pm of (project as any).plannedMaterials) {
      const qty = safeNum(pm?.quantity);
      const unitCost = safeNum(pm?.unitCost);
      materialCost += qty * unitCost;
    }
  }

  // plannedServices
  if (Array.isArray((project as any).plannedServices)) {
    for (const ps of (project as any).plannedServices) {
      // alguns projetos usam hours, outros quantity — mantém robusto
      const hours = safeNum(ps?.hours ?? ps?.quantity);
      const unitCost = safeNum(ps?.unitCost);
      serviceCost += hours * unitCost;
    }
  }

  // overrides manuais (se existirem no seu projeto original)
  if ((project as any).manualMaterialCost != null) {
    materialCost = safeNum((project as any).manualMaterialCost);
  }
  if ((project as any).manualServiceCost != null) {
    serviceCost = safeNum((project as any).manualServiceCost);
  }

  const totalCost = materialCost + serviceCost;

  return { materialCost, serviceCost, totalCost };
}

export const engine = {
  load(): EngineDB {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultDB();
      const parsed = JSON.parse(raw) as EngineDB;

      // fallback de campos novos
      (parsed as any).withdrawals = (parsed as any).withdrawals || [];
      (parsed as any).projects = (parsed as any).projects || [];
      (parsed as any).equipments = (parsed as any).equipments || [];
      (parsed as any).users = (parsed as any).users || [];
      (parsed as any).os = ((parsed as any).os || []).map((o: any) => ({
        ...o,
        createdAt: o.createdAt || nowISO(),
        executions: o.executions || [],
        withdrawals: o.withdrawals || [],
      }));

      return parsed;
    } catch {
      return defaultDB();
    }
  },

  save(db: EngineDB) {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  },

  uuid,

  // PAUSE HISTORY helpers
  addPauseEvent(osId: string, executorId: string, ev: Omit<PauseEvent, "id">) {
    const db = this.load();
    const os = db.os.find((o) => o.id === osId);
    if (!os) return;

    const ex = (os.executions || []).find((e) => e.executorId === executorId);
    if (!ex) return;

    ex.pauseHistory = ex.pauseHistory || [];
    ex.pauseHistory.push({ ...ev, id: uuid() });

    this.save(db);
  },

  // withdrawals (baixas)
  addWithdrawal(withdrawal: Omit<MaterialWithdrawal, "id" | "createdAt">) {
    const db = this.load();
    const w: MaterialWithdrawal = {
      ...withdrawal,
      id: uuid(),
      createdAt: nowISO(),
    };
    db.withdrawals.unshift(w);

    if (w.osId) {
      const os = db.os.find((o) => o.id === w.osId);
      if (os) {
        os.withdrawals = os.withdrawals || [];
        os.withdrawals.unshift(w);
      }
    }

    this.save(db);
    return w;
  },

  // Equipment update with new fields (company/sector/parentEquipmentId)
  upsertEquipment(eq: Equipment) {
    const db = this.load();
    const idx = db.equipments.findIndex((e) => e.id === eq.id);
    if (idx >= 0) db.equipments[idx] = { ...db.equipments[idx], ...eq };
    else db.equipments.unshift(eq);
    this.save(db);
  },

  upsertProject(p: Project) {
    const db = this.load();
    const idx = db.projects.findIndex((x) => x.id === p.id);
    if (idx >= 0) db.projects[idx] = { ...db.projects[idx], ...p };
    else db.projects.unshift(p);
    this.save(db);
  },

  upsertUser(u: User) {
    const db = this.load();
    const idx = db.users.findIndex((x) => x.id === u.id);
    if (idx >= 0) db.users[idx] = { ...db.users[idx], ...u };
    else db.users.unshift(u);
    this.save(db);
  },

  upsertOS(o: OS) {
    const db = this.load();
    const idx = db.os.findIndex((x) => x.id === o.id);
    if (idx >= 0) db.os[idx] = { ...db.os[idx], ...o };
    else db.os.unshift(o);
    this.save(db);
  },
};