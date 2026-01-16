
import { OS, Material, ServiceType, Project, OSStatus, ServiceCostType } from '../types';

export const calculateOSCosts = (os: OS, materials: Material[], services: ServiceType[]) => {
  // Materiais apropriados na OS (Usa o unitCost gravado no momento da OS, não o do cadastro atual)
  const materialCost = os.materials.reduce((acc, item) => {
    return acc + (item.quantity * item.unitCost);
  }, 0);

  // Serviços lançados na OS (Usa o unitCost gravado no momento da OS)
  const serviceCost = os.services.reduce((acc, srvEntry) => {
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
