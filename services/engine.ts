
import { OS, Material, ServiceType, Project, OSStatus, ServiceCostType } from '../types';

export const calculateOSCosts = (os: OS, materials: Material[], services: ServiceType[]) => {
  // Materiais apropriados na OS
  const materialCost = os.materials.reduce((acc, item) => {
    return acc + (item.quantity * item.unitCost);
  }, 0);

  // Serviços lançados na OS - Diferencia entre Horas e Valor Fixo
  const serviceCost = os.services.reduce((acc, srvEntry) => {
    // Apenas para consistência, se necessário buscar valor atual, mas usamos o histórico da OS geralmente
    return acc + (srvEntry.quantity * srvEntry.unitCost);
  }, 0);

  return {
    materialCost,
    serviceCost,
    totalCost: materialCost + serviceCost
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
    const mat = materials.find(m => m.id === pm.materialId);
    return acc + (pm.quantity * (mat?.unitCost || 0));
  }, 0);

  const srvCost = (project.plannedServices || []).reduce((acc, ps) => {
    // Assumindo custo hora genérico ou unitValue do serviço se tiver (no momento serviços são internos = 0, mas preparado para valor)
    const srv = services.find(s => s.id === ps.serviceTypeId);
    return acc + (ps.hours * (srv?.unitValue || 0)); 
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
