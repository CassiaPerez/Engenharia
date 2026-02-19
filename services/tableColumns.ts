export const TABLE_COLUMNS = {
  users: 'id, name, email, role, department, avatar, active, company, created_at, updated_at',
  oss: 'id, number, type, status, priority, description, equipment_id, cost_center, open_date, limit_date, close_date, sla_hours, executor_ids, requester_id, services, materials, created_at, updated_at',
  equipments: 'id, code, name, description, manufacturer, model, serial_number, location, status, notes, created_at, updated_at',
  materials: 'id, code, description, unit, "group", location, status, current_stock, min_stock, unit_cost, stock_locations, created_at, updated_at',
  buildings: 'id, name, type, address, city, manager, notes, created_at, updated_at',
  services: 'id, name, description, category, team, cost_type, unit_value, created_at, updated_at',
  projects: 'id, code, description, detailed_description, category, status, reason_type, reason, responsible, cost_center, location, area, city, start_date, estimated_end_date, estimated_value, sla_days, planned_services, planned_materials, audit_logs, postponement_history, created_at, updated_at',
  suppliers: 'id, name, cnpj, contact, phone, email, address, city, state, notes, active, created_at, updated_at',
  purchases: 'id, json_content, updated_at',
  stock_movements: 'id, json_content, updated_at',
  role_permissions: '*',
  user_permissions: '*'
} as const;

export function getTableColumns(table: string): string {
  return TABLE_COLUMNS[table as keyof typeof TABLE_COLUMNS] || 'id, json_content, created_at, updated_at';
}
