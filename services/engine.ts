// services/engine.ts
import { OS, Material, ServiceType, Project, User, Equipment, ServiceCostType } from '../types';

export const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
};

/**
 * Planejado no formulário (Partial<Project>) + materiais/serviços para custo unitário
 * ✅ compatível com seu useMemo:
 * calculatePlannedCosts(formProject, materials, services)
 */
export const calculatePlannedCosts = (
  projectLike: Partial<Project>,
  materials: Material[] = [],
  services: ServiceType[] = []
) => {
  const plannedMaterials = projectLike.plannedMaterials || [];
  const plannedServices = projectLike.plannedServices || [];

  const matCost = plannedMaterials.reduce((acc, pm) => {
    // usa unitCost salvo no planejamento, senão tenta achar no cadastro
    const mat = materials.find(m => m.id === pm.materialId);
    const unit = pm.unitCost ?? mat?.unitCost ?? 0;
    return acc + (Number(pm.quantity) || 0) * unit;
  }, 0);

  const srvCost = plannedServices.reduce((acc, ps) => {
    const srv = services.find(s => s.id === ps.serviceTypeId);
    const unit = ps.unitCost ?? srv?.unitValue ?? 0;
    return acc + (Number(ps.hours) || 0) * unit;
  }, 0);

  return {
    matCost,
    srvCost,
    totalPlanned: matCost + srvCost,
  };
};

export const calculateOSCosts = (os: OS) => {
  const calculatedMaterialCost = (os.materials || []).reduce((acc, item) => acc + item.quantity * item.unitCost, 0);
  const calculatedServiceCost = (os.services || []).reduce((acc, srv) => acc + srv.quantity * srv.unitCost, 0);

  const materialCost = os.manualMaterialCost ?? calculatedMaterialCost;
  const serviceCost = os.manualServiceCost ?? calculatedServiceCost;

  return {
    materialCost,
    serviceCost,
    totalCost: materialCost + serviceCost,
    isManualMaterial: os.manualMaterialCost !== undefined && os.manualMaterialCost !== null,
    isManualService: os.manualServiceCost !== undefined && os.manualServiceCost !== null,
  };
};

/**
 * ✅ Retorno compatível com seu código (totalReal/totalMaterials/totalServices)
 * + adiciona auto/manual/effective
 */
export const calculateProjectCosts = (
  project: Project,
  oss: OS[] = [],
  _materials: Material[] = [],
  _services: ServiceType[] = []
) => {
  const projectOSs = oss.filter(os => os.projectId === project.id && os.status !== 'CANCELED');

  // --- AUTO (via OS)
  let autoMaterials = 0;
  let autoServices = 0;

  projectOSs.forEach(os => {
    const c = calculateOSCosts(os);
    autoMaterials += c.materialCost;
    autoServices += c.serviceCost;
  });

  const autoTotal = autoMaterials + autoServices;

  // --- MANUAL (extras no projeto)
  const manualMaterials = project.manualMaterialCost ?? 0;
  const manualServices = project.manualServiceCost ?? 0;
  const manualTotal = manualMaterials + manualServices;

  // --- EFETIVO (decisão por flag)
  const effectiveMaterials = project.useManualMaterialCost ? manualMaterials : autoMaterials;
  const effectiveServices = project.useManualServiceCost ? manualServices : autoServices;
  const effectiveTotal = effectiveMaterials + effectiveServices;

  const variance = project.estimatedValue - effectiveTotal;
  const variancePercent = project.estimatedValue > 0 ? (variance / project.estimatedValue) * 100 : 0;

  // ✅ Campos “legados” que seu ProjectList já usa:
  const totalMaterials = effectiveMaterials;
  const totalServices = effectiveServices;
  const totalReal = effectiveTotal;

  return {
    // legado
    totalMaterials,
    totalServices,
    totalReal,

    // novos detalhados
    autoMaterials,
    autoServices,
    autoTotal,

    manualMaterials,
    manualServices,
    manualTotal,

    effectiveMaterials,
    effectiveServices,
    effectiveTotal,

    variance,
    variancePercent,
  };
};

// (mantive para compatibilidade, se você usa em algum lugar)
export const translateServiceCostType = (type: ServiceCostType) => {
  switch (type) {
    case ServiceCostType.HOUR:
      return 'Por Hora';
    case ServiceCostType.UNIT:
      return 'Por Unidade';
    default:
      return String(type);
  }
};

// Custo por empresa (se você usa em Reports)
export const resolveCompanyForOS = (os: OS, equipments: Equipment[] = [], projects: Project[] = []) => {
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
  equipments: Equipment[] = [],
  projects: Project[] = []
) => {
  const byCompany: Record<string, { material: number; service: number; total: number }> = {};

  oss.forEach(os => {
    const company = resolveCompanyForOS(os, equipments, projects);
    const c = calculateOSCosts(os);
    if (!byCompany[company]) byCompany[company] = { material: 0, service: 0, total: 0 };
    byCompany[company].material += c.materialCost;
    byCompany[company].service += c.serviceCost;
    byCompany[company].total += c.totalCost;
  });

  return Object.entries(byCompany)
    .map(([company, v]) => ({ company, material: v.material, service: v.service, total: v.total }))
    .sort((a, b) => b.total - a.total);
};

// Horas por executor (se você usa em Reports)
const safeDate = (d?: string) => (d ? new Date(d) : null);

export const calculateExecutorHoursForOS = (os: OS, executorId: string) => {
  const state = os.executorStates?.[executorId];
  const start = safeDate(state?.startTime || os.startTime);
  const end = safeDate(state?.endTime || os.endTime);
  if (!start || !end) return { grossHours: 0, pausedHours: 0, netHours: 0 };

  const grossMs = end.getTime() - start.getTime();
  const history = state?.pauseHistory || [];

  let pausedMs = 0;
  let lastPause: Date | null = null;

  history.forEach(h => {
    if (h.action === 'PAUSE') lastPause = new Date(h.timestamp);
    if (h.action === 'RESUME' && lastPause) {
      pausedMs += new Date(h.timestamp).getTime() - lastPause.getTime();
      lastPause = null;
    }
  });

  if (lastPause) pausedMs += end.getTime() - lastPause.getTime();

  const msToHours = (ms: number) => ms / 3600000;
  const netMs = Math.max(0, grossMs - pausedMs);

  return {
    grossHours: msToHours(grossMs),
    pausedHours: msToHours(pausedMs),
    netHours: msToHours(netMs),
  };
};

export const buildExecutorHoursRows = (oss: OS[], users: User[], dateFrom?: string, dateTo?: string) => {
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;

  const within = (d?: string) => {
    if (!d) return true;
    const dt = new Date(d);
    if (from && dt < from) return false;
    if (to && dt > to) return false;
    return true;
  };

  const rows: any[] = [];

  oss.forEach(os => {
    if (os.executorStates) {
      Object.entries(os.executorStates).forEach(([executorId, st]) => {
        const ref = st.startTime || os.openDate;
        if (!within(ref)) return;

        const name = users.find(u => u.id === executorId)?.name || executorId;
        const hrs = calculateExecutorHoursForOS(os, executorId);

        rows.push({
          executorId,
          executorName: name,
          osNumber: os.number,
          startTime: st.startTime,
          endTime: st.endTime,
          ...hrs,
        });
      });
    }
  });

  return rows;
};