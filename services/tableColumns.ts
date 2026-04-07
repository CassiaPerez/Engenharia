export const TABLE_COLUMNS = {
  users: 'id, name, email, role, department, avatar, active, company, updated_at',
  oss: 'id, number, type, status, priority, description, equipment_id, cost_center, open_date, limit_date, close_date, sla_hours, executor_ids, requester_id, project_id, building_id, executor_id, requester_name, start_time, end_time, pause_reason, manual_material_cost, manual_service_cost, updated_at',
  equipments: 'id, code, name, description, manufacturer, model, serial_number, location, status, notes, updated_at',
  materials: 'id, code, description, unit, "group", location, status, current_stock, min_stock, unit_cost, updated_at',
  buildings: 'id, name, type, address, city, manager, notes, updated_at',
  services: 'id, name, description, category, team, cost_type, unit_value, updated_at',
  projects: 'id, code, description, detailed_description, category, status, reason_type, reason, responsible, cost_center, location, area, city, start_date, estimated_end_date, estimated_value, sla_days, manual_material_cost, manual_service_cost, extra_materials_value, extra_materials_description, extra_services_value, extra_services_description, updated_at',
  suppliers: 'id, name, cnpj, contact, phone, email, address, city, state, notes, active, updated_at',
  purchases: 'id, json_content, updated_at',
  stock_movements: 'id, json_content, updated_at, unit_cost',
  role_permissions: 'id, role, module, permissions, created_at, updated_at',
  user_permissions: 'id, user_id, module, permissions, warehouses, field_permissions, created_at, updated_at'
} as const;

export const TABLE_COLUMNS_FULL = {
  oss: 'id, number, type, status, priority, description, equipment_id, cost_center, open_date, limit_date, close_date, sla_hours, executor_ids, requester_id, services, materials, manual_material_cost, manual_service_cost, manual_material_description, manual_service_description, manual_material_items, manual_service_items, executor_work_logs, project_id, building_id, executor_id, executor_states, start_time, end_time, pause_reason, pause_history, completion_image, execution_description, requester_name, updated_at',
  projects: 'id, code, description, detailed_description, category, status, reason_type, reason, responsible, cost_center, location, area, city, start_date, estimated_end_date, estimated_value, sla_days, planned_services, planned_materials, audit_logs, postponement_history, manual_material_cost, manual_service_cost, extra_materials_value, extra_materials_description, extra_services_value, extra_services_description, manual_material_description, manual_service_description, manual_material_items, manual_service_items, updated_at',
  materials: 'id, code, description, unit, "group", location, status, current_stock, min_stock, unit_cost, stock_locations, updated_at'
} as const;

const VALID_TABLES = new Set(Object.keys(TABLE_COLUMNS));

export function getTableColumns(table: string, full: boolean = false): string {
  if (!VALID_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}. Table not mapped in TABLE_COLUMNS.`);
  }

  if (full && table in TABLE_COLUMNS_FULL) {
    return TABLE_COLUMNS_FULL[table as keyof typeof TABLE_COLUMNS_FULL];
  }

  return TABLE_COLUMNS[table as keyof typeof TABLE_COLUMNS];
}

export function isValidTable(table: string): boolean {
  return VALID_TABLES.has(table);
}
