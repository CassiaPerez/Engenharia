import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper para converter dados do formato do banco para o objeto da aplicação
// Suporta colunas normalizadas e converte snake_case -> camelCase
const snakeToCamel = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(value);
  }
  return result;
};

export const mapFromSupabase = <T extends { id: string }>(data: any[] | null): T[] => {
  if (!data) return [];

  return data.map((row) => {
    const { id, json_content, created_at, updated_at, ...normalizedColumns } = row;

    const hasNormalizedData =
      Object.keys(normalizedColumns).length > 0 &&
      Object.values(normalizedColumns).some(v => v !== null && v !== undefined);

    if (hasNormalizedData) {
      const camelCased = snakeToCamel(normalizedColumns);

      if (camelCased.stockLocations && Array.isArray(camelCased.stockLocations)) {
        camelCased.stockLocations = camelCased.stockLocations.map((loc: any) => ({
          name: loc.name || loc.location,
          quantity: loc.quantity ?? loc.stock ?? 0
        }));
      }

      return {
        ...camelCased,
        id,
        createdAt: created_at,
        updatedAt: updated_at
      } as T;
    }

    return {
      ...(json_content as T),
      id,
      createdAt: created_at,
      updatedAt: updated_at
    };
  });
};

// Helper para preparar dados para upsert no formato normalizado
export const mapToSupabase = <T extends { id: string }>(item: T) => {
  const { id, createdAt, updatedAt, ...rest } = item as any;

  const normalizedData: any = { id };

  // USERS
  if ('name' in rest) normalizedData.name = rest.name;
  if ('email' in rest) normalizedData.email = rest.email;
  if ('password' in rest) normalizedData.password = rest.password;
  if ('role' in rest) normalizedData.role = rest.role;
  if ('department' in rest) normalizedData.department = rest.department;
  if ('avatar' in rest) normalizedData.avatar = rest.avatar;
  if ('active' in rest) normalizedData.active = rest.active;
  if ('company' in rest) normalizedData.company = rest.company;

  // OSS
  if ('number' in rest) normalizedData.number = rest.number;
  if ('projectId' in rest) normalizedData.project_id = rest.projectId;
  if ('buildingId' in rest) normalizedData.building_id = rest.buildingId;
  if ('equipmentId' in rest) normalizedData.equipment_id = rest.equipmentId;
  if ('type' in rest) normalizedData.type = rest.type;
  if ('status' in rest) normalizedData.status = rest.status;
  if ('priority' in rest) normalizedData.priority = rest.priority;
  if ('description' in rest) normalizedData.description = rest.description;
  if ('costCenter' in rest) normalizedData.cost_center = rest.costCenter;
  if ('openDate' in rest) normalizedData.open_date = rest.openDate;
  if ('limitDate' in rest) normalizedData.limit_date = rest.limitDate;
  if ('closeDate' in rest) normalizedData.close_date = rest.closeDate;
  if ('slaHours' in rest) normalizedData.sla_hours = rest.slaHours;

  if ('executorId' in rest) normalizedData.executor_id = rest.executorId;
  if ('executorIds' in rest) normalizedData.executor_ids = rest.executorIds;
  if ('executorStates' in rest) normalizedData.executor_states = rest.executorStates;

  if ('requesterId' in rest) normalizedData.requester_id = rest.requesterId;
  if ('requesterName' in rest) normalizedData.requester_name = rest.requesterName;

  if ('startTime' in rest) normalizedData.start_time = rest.startTime;
  if ('endTime' in rest) normalizedData.end_time = rest.endTime;
  if ('pauseReason' in rest) normalizedData.pause_reason = rest.pauseReason;
  if ('pauseHistory' in rest) normalizedData.pause_history = rest.pauseHistory;

  if ('completionImage' in rest) normalizedData.completion_image = rest.completionImage;
  if ('executionDescription' in rest) normalizedData.execution_description = rest.executionDescription;

  if ('services' in rest) normalizedData.services = rest.services;
  if ('materials' in rest) normalizedData.materials = rest.materials;

  // EQUIPMENTS / BUILDINGS / ETC
  if ('code' in rest) normalizedData.code = rest.code;
  if ('manufacturer' in rest) normalizedData.manufacturer = rest.manufacturer;
  if ('model' in rest) normalizedData.model = rest.model;
  if ('serialNumber' in rest) normalizedData.serial_number = rest.serialNumber;
  if ('location' in rest) normalizedData.location = rest.location;
  if ('notes' in rest) normalizedData.notes = rest.notes;

  // MATERIALS
  if ('unit' in rest) normalizedData.unit = rest.unit;
  if ('group' in rest) normalizedData.group = rest.group;
  if ('currentStock' in rest) normalizedData.current_stock = rest.currentStock;
  if ('minStock' in rest) normalizedData.min_stock = rest.minStock;
  if ('unitCost' in rest) normalizedData.unit_cost = rest.unitCost;
  if ('stockLocations' in rest) {
    normalizedData.stock_locations = rest.stockLocations.map((loc: any) => ({
      location: loc.name,
      stock: loc.quantity
    }));
  }

  // BUILDINGS
  if ('address' in rest) normalizedData.address = rest.address;
  if ('city' in rest) normalizedData.city = rest.city;
  if ('manager' in rest) normalizedData.manager = rest.manager;

  // SERVICES
  if ('category' in rest) normalizedData.category = rest.category;
  if ('team' in rest) normalizedData.team = rest.team;
  if ('costType' in rest) normalizedData.cost_type = rest.costType;
  if ('unitValue' in rest) normalizedData.unit_value = rest.unitValue;

  // PROJECTS
  if ('detailedDescription' in rest) normalizedData.detailed_description = rest.detailedDescription;
  if ('reasonType' in rest) normalizedData.reason_type = rest.reasonType;
  if ('reason' in rest) normalizedData.reason = rest.reason;
  if ('responsible' in rest) normalizedData.responsible = rest.responsible;
  if ('area' in rest) normalizedData.area = rest.area;
  if ('startDate' in rest) normalizedData.start_date = rest.startDate;
  if ('estimatedEndDate' in rest) normalizedData.estimated_end_date = rest.estimatedEndDate;
  if ('estimatedValue' in rest) normalizedData.estimated_value = rest.estimatedValue;
  if ('slaDays' in rest) normalizedData.sla_days = rest.slaDays;
  if ('plannedServices' in rest) normalizedData.planned_services = rest.plannedServices;
  if ('plannedMaterials' in rest) normalizedData.planned_materials = rest.plannedMaterials;
  if ('auditLogs' in rest) normalizedData.audit_logs = rest.auditLogs;
  if ('postponementHistory' in rest) normalizedData.postponement_history = rest.postponementHistory;

  // Custos manuais
  if ('manualMaterialCost' in rest) normalizedData.manual_material_cost = rest.manualMaterialCost;
  if ('manualServiceCost' in rest) normalizedData.manual_service_cost = rest.manualServiceCost;
  if ('manualMaterialDescription' in rest) normalizedData.manual_material_description = rest.manualMaterialDescription;
  if ('manualServiceDescription' in rest) normalizedData.manual_service_description = rest.manualServiceDescription;
  if ('manualMaterialItems' in rest) normalizedData.manual_material_items = rest.manualMaterialItems;
  if ('manualServiceItems' in rest) normalizedData.manual_service_items = rest.manualServiceItems;

  // SUPPLIERS
  if ('cnpj' in rest) normalizedData.cnpj = rest.cnpj;
  if ('contact' in rest) normalizedData.contact = rest.contact;
  if ('phone' in rest) normalizedData.phone = rest.phone;
  if ('state' in rest) normalizedData.state = rest.state;

  return normalizedData;
};

// Legacy helper for tables that still use json_content
export const mapToSupabaseJson = <T extends { id: string }>(item: T) => {
  return {
    id: item.id,
    json_content: { ...item, id: item.id }
  };
};