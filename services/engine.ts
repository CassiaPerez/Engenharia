
import { OS, Material, ServiceType, Project } from '../types';

export const calculateOSCosts = (os: OS, materials: Material[], services: ServiceType[]) => {
  const materialCost = os.materials.reduce((acc, item) => {
    return acc + (item.quantity * item.unitCost);
  }, 0);

  const serviceCost = os.services.reduce((acc, srv) => {
    return acc + (srv.quantity * srv.unitCost);
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

  return {
    totalMaterials,
    totalServices,
    totalReal: totalMaterials + totalServices,
    variance: project.estimatedValue - (totalMaterials + totalServices)
  };
};

export const checkSLA = (limitDate: string, completionDate?: string) => {
  const limit = new Date(limitDate);
  const completion = completionDate ? new Date(completionDate) : new Date();
  return completion <= limit;
};

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};
