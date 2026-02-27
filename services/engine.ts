import {
  OS,
  Material,
  ServiceType,
  Project,
  ServiceCostType,
  User,
  Equipment
} from '../types';

/**
 * ==========================
 * CÁLCULO DE CUSTO DA OS
 * ==========================
 */
export const calculateOSCosts = (
  os: OS,
  materials: Material[],
  services: ServiceType[]
) => {
  const calculatedMaterialCost = os.materials.reduce((acc, item) => {
    return acc + item.quantity * item.unitCost;
  }, 0);

  const calculatedServiceCost = os.services.reduce((acc, srvEntry) => {
    return acc + srvEntry.quantity * srvEntry.unitCost;
  }, 0);

  const materialCost =
    os.manualMaterialCost !== undefined &&
    os.manualMaterialCost !== null
      ? os.manualMaterialCost
      : calculatedMaterialCost;

  const serviceCost =
    os.manualServiceCost !== undefined &&
    os.manualServiceCost !== null
      ? os.manualServiceCost
      : calculatedServiceCost;

  return {
    materialCost,
    serviceCost,
    totalCost: materialCost + serviceCost,
    isManualMaterial:
      os.manualMaterialCost !== undefined &&
      os.manualMaterialCost !== null,
    isManualService:
      os.manualServiceCost !== undefined &&
      os.manualServiceCost !== null
  };
};

/**
 * ==========================================
 * PROJETO – AUTO + MANUAL + EFETIVO
 * ==========================================
 */
export const calculateProjectCosts = (
  project: Project,
  oss: OS[],
  materials: Material[],
  services: ServiceType[]
) => {
  const projectOSs = oss.filter(os => os.projectId === project.id);

  // 1️⃣ AUTOMÁTICO (baixa via OS)
  let autoMaterials = 0;
  let autoServices = 0;

  projectOSs.forEach(os => {
    const costs = calculateOSCosts(os, materials, services);
    autoMaterials += costs.materialCost;
    autoServices += costs.serviceCost;
  });

  const autoTotal = autoMaterials + autoServices;

  // 2️⃣ MANUAL
  const manualMaterials = project.manualMaterialCost ?? 0;
  const manualServices = project.manualServiceCost ?? 0;
  const manualTotal = manualMaterials + manualServices;

  // 3️⃣ EFETIVO (decisão)
  const effectiveMaterials = project.useManualMaterialCost
    ? manualMaterials
    : autoMaterials;

  const effectiveServices = project.useManualServiceCost
    ? manualServices
    : autoServices;

  const effectiveTotal = effectiveMaterials + effectiveServices;

  return {
    autoMaterials,
    autoServices,
    autoTotal,

    manualMaterials,
    manualServices,
    manualTotal,

    effectiveMaterials,
    effectiveServices,
    effectiveTotal,

    variance: project.estimatedValue - effectiveTotal,
    variancePercent:
      project.estimatedValue > 0
        ? ((project.estimatedValue - effectiveTotal) /
            project.estimatedValue) *
          100
        : 0
  };
};

/**
 * ==========================================
 * AGRUPAMENTO POR EMPRESA
 * ==========================================
 */
export const resolveCompanyForOS = (
  os: OS,
  equipments: Equipment[] = [],
  projects: Project[] = []
): string => {
  if (os.equipmentId) {
    const eq = equipments.find(e => e.id === os.equipmentId);
    if (eq?.location) return eq.location;
  }

  if (os.projectId) {
    const p = projects.find(p => p.id === os.projectId);
    if (p?.location) return p.location;
  }

  return 'Não informado';
};

export const groupCostsByCompany = (
  oss: OS[],
  materials: Material[],
  services: ServiceType[],
  equipments: Equipment[] = [],
  projects: Project[] = []
) => {
  const byCompany: Record<
    string,
    { material: number; service: number; total: number }
  > = {};

  oss.forEach(os => {
    const company = resolveCompanyForOS(os, equipments, projects);
    const costs = calculateOSCosts(os, materials, services);

    if (!byCompany[company]) {
      byCompany[company] = { material: 0, service: 0, total: 0 };
    }

    byCompany[company].material += costs.materialCost;
    byCompany[company].service += costs.serviceCost;
    byCompany[company].total += costs.totalCost;
  });

  return Object.entries(byCompany)
    .map(([company, v]) => ({
      company,
      material: v.material,
      service: v.service,
      total: v.total
    }))
    .sort((a, b) => b.total - a.total);
};

/**
 * ==========================================
 * HORAS DE EXECUTOR
 * ==========================================
 */
const safeDate = (d?: string) => (d ? new Date(d) : null);

export const calculateExecutorHoursForOS = (
  os: OS,
  executorId: string
) => {
  const state = os.executorStates?.[executorId];

  const start = safeDate(state?.startTime || os.startTime);
  const end = safeDate(state?.endTime || os.endTime);

  if (!start || !end) {
    return { grossHours: 0, pausedHours: 0, netHours: 0 };
  }

  const grossMs = end.getTime() - start.getTime();

  const history = state?.pauseHistory || [];
  let pausedMs = 0;
  let lastPause: Date | null = null;

  history.forEach(h => {
    if (h.action === 'PAUSE') {
      lastPause = new Date(h.timestamp);
    }

    if (h.action === 'RESUME' && lastPause) {
      pausedMs +=
        new Date(h.timestamp).getTime() - lastPause.getTime();
      lastPause = null;
    }
  });

  if (lastPause) {
    pausedMs += end.getTime() - lastPause.getTime();
  }

  const netMs = Math.max(0, grossMs - pausedMs);
  const msToHours = (ms: number) => ms / 3600000;

  return {
    grossHours: msToHours(grossMs),
    pausedHours: msToHours(pausedMs),
    netHours: msToHours(netMs)
  };
};

export const buildExecutorHoursRows = (
  oss: OS[],
  users: User[],
  dateFrom?: string,
  dateTo?: string
) => {
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;

  const rows: any[] = [];

  const within = (d?: string) => {
    if (!d) return true;
    const dt = new Date(d);
    if (from && dt < from) return false;
    if (to && dt > to) return false;
    return true;
  };

  oss.forEach(os => {
    if (os.executorStates) {
      Object.entries(os.executorStates).forEach(
        ([executorId, st]) => {
          const ref = st.startTime || os.openDate;
          if (!within(ref)) return;

          const name =
            users.find(u => u.id === executorId)?.name ||
            executorId;

          const hrs = calculateExecutorHoursForOS(
            os,
            executorId
          );

          rows.push({
            executorId,
            executorName: name,
            osNumber: os.number,
            startTime: st.startTime,
            endTime: st.endTime,
            ...hrs
          });
        }
      );
    }
  });

  return rows;
};