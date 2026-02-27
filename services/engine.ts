
import { OS, Material, ServiceType, Project, OSStatus, ServiceCostType, User, Equipment } from '../types';

export const calculateOSCosts = (os: OS, materials: Material[], services: ServiceType[]) => {
  // Usa valor manual se definido, senão calcula pela soma dos itens
  const calculatedMaterialCost = os.materials.reduce((acc, item) => {
    return acc + (item.quantity * item.unitCost);
  }, 0);

  const calculatedServiceCost = os.services.reduce((acc, srvEntry) => {
    return acc + (srvEntry.quantity * srvEntry.unitCost);
  }, 0);

  const materialCost = os.manualMaterialCost !== undefined && os.manualMaterialCost !== null
    ? os.manualMaterialCost
    : calculatedMaterialCost;

  const serviceCost = os.manualServiceCost !== undefined && os.manualServiceCost !== null
    ? os.manualServiceCost
    : calculatedServiceCost;

  return {
    materialCost,
    serviceCost,
    totalCost: materialCost + serviceCost,
    isManualMaterial: os.manualMaterialCost !== undefined && os.manualMaterialCost !== null,
    isManualService: os.manualServiceCost !== undefined && os.manualServiceCost !== null
  };
};

export const calculateProjectCosts = (project: Project, oss: OS[], materials: Material[], services: ServiceType[]) => {
  const projectOSs = oss.filter(os => os.projectId === project.id);

  let totalMaterials = 0;
  let totalServices = 0;

  projectOSs.forEach(os => {
    const costs = calculateOSCosts(os, materials, services);
    totalMaterials += costs.materialCost;
    totalServices += costs.serviceCost;
  });

  // Adiciona valores manuais do projeto se definidos
  if (project.manualMaterialCost !== undefined && project.manualMaterialCost !== null) {
    totalMaterials += project.manualMaterialCost;
  }
  if (project.manualServiceCost !== undefined && project.manualServiceCost !== null) {
    totalServices += project.manualServiceCost;
  }

  const totalReal = totalMaterials + totalServices;

  return {
    totalMaterials,
    totalServices,
    totalReal,
    variance: project.estimatedValue - totalReal,
    variancePercent: project.estimatedValue > 0 ? (totalReal / project.estimatedValue) * 100 : 0
  };
};

export const calculatePlannedCosts = (project: Partial<Project>, materials: Material[], services: ServiceType[]) => {
  const matCost = (project.plannedMaterials || []).reduce((acc, pm) => {
    // Usa o custo manual definido no planejamento, ou fallback para o cadastro se não existir (compatibilidade)
    const manualCost = pm.unitCost;
    const catalogCost = materials.find(m => m.id === pm.materialId)?.unitCost || 0;
    const finalCost = manualCost !== undefined ? manualCost : catalogCost;
    
    return acc + (pm.quantity * finalCost);
  }, 0);

  const srvCost = (project.plannedServices || []).reduce((acc, ps) => {
    // Usa o custo manual definido no planejamento
    const manualCost = ps.unitCost;
    const catalogCost = services.find(s => s.id === ps.serviceTypeId)?.unitValue || 0;
    const finalCost = manualCost !== undefined ? manualCost : catalogCost;

    return acc + (ps.hours * finalCost); 
  }, 0);

  return {
    matCost,
    srvCost,
    totalPlanned: matCost + srvCost
  };
};

export const checkSLA = (limitDate: string, completionDate?: string) => {
  const limit = new Date(limitDate);
  const completion = completionDate ? new Date(completionDate) : new Date();
  return completion <= limit;
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case OSStatus.COMPLETED:
    case 'FINISHED':
      return 'emerald';
    case OSStatus.IN_PROGRESS:
      return 'blue';
    case OSStatus.OPEN:
      return 'amber';
    case OSStatus.CANCELED:
      return 'slate';
    default:
      return 'slate';
  }
};


// --------------------
// Relatórios adicionais (incremental, sem quebrar legado)
// --------------------
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
  const byCompany: Record<string, { material: number; service: number; total: number }> = {};

  oss.forEach(os => {
    const company = resolveCompanyForOS(os, equipments, projects);
    const costs = calculateOSCosts(os, materials, services);
    if (!byCompany[company]) byCompany[company] = { material: 0, service: 0, total: 0 };
    byCompany[company].material += costs.materialCost;
    byCompany[company].service += costs.serviceCost;
    byCompany[company].total += costs.totalCost;
  });

  return Object.entries(byCompany)
    .map(([company, v]) => ({ company, material: v.material, service: v.service, total: v.total }))
    .sort((a, b) => b.total - a.total);
};

const safeDate = (d?: string) => (d ? new Date(d) : null);

export const calculateExecutorHoursForOS = (os: OS, executorId: string) => {
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
    if (h.action === 'PAUSE') lastPause = new Date(h.timestamp);
    if (h.action === 'RESUME' && lastPause) {
      pausedMs += new Date(h.timestamp).getTime() - lastPause.getTime();
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

  const within = (d?: string) => {
    if (!d) return true;
    const dt = new Date(d);
    if (from && dt < from) return false;
    if (to && dt > to) return false;
    return true;
  };

  const rows: Array<{
    executorId: string;
    executorName: string;
    osNumber: string;
    startTime?: string;
    endTime?: string;
    grossHours: number;
    pausedHours: number;
    netHours: number;
  }> = [];

  oss.forEach(os => {
    if (os.executorStates && Object.keys(os.executorStates).length > 0) {
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
          ...hrs
        });
      });
      return;
    }

    const executorId = os.executorId;
    if (!executorId) return;
    const ref = os.startTime || os.openDate;
    if (!within(ref)) return;

    const name = users.find(u => u.id === executorId)?.name || executorId;
    const hrs = calculateExecutorHoursForOS(os, executorId);
    rows.push({
      executorId,
      executorName: name,
      osNumber: os.number,
      startTime: os.startTime,
      endTime: os.endTime,
      ...hrs
    });
  });

  return rows;
};
