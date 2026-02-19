/*
  # Normalize projects table structure

  ## Description
  Convert json_content fields to proper columns for better project management.

  ## Changes
  1. New Columns
    - `code` (text) - Project code (e.g., PRJ-2026-822)
    - `description` (text) - Project description
    - `detailed_description` (text) - Detailed description
    - `category` (text) - Project category (Engenharia, etc)
    - `status` (text) - Project status (PLANNED, IN_PROGRESS, COMPLETED, etc)
    - `reason_type` (text) - Reason type (Preventiva, Corretiva, etc)
    - `reason` (text) - Reason for project
    - `responsible` (text) - Responsible person
    - `cost_center` (text) - Cost center
    - `location` (text) - Project location
    - `area` (text) - Area
    - `city` (text) - City
    - `start_date` (date) - Start date
    - `estimated_end_date` (date) - Estimated end date
    - `estimated_value` (numeric) - Estimated value
    - `sla_days` (integer) - SLA in days
    - `planned_services` (jsonb) - Planned services array
    - `planned_materials` (jsonb) - Planned materials array
    - `audit_logs` (jsonb) - Audit logs array
    - `postponement_history` (jsonb) - Postponement history array

  2. Data Migration
    - Extract all scalar fields from json_content
    - Keep arrays as JSONB for flexibility

  3. Indexes
    - Add indexes on code, status, category, dates

  4. Performance
    - Faster project queries and reporting
*/

-- Add new columns
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS detailed_description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PLANNED',
  ADD COLUMN IF NOT EXISTS reason_type text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS responsible text,
  ADD COLUMN IF NOT EXISTS cost_center text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS estimated_end_date date,
  ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_days integer,
  ADD COLUMN IF NOT EXISTS planned_services jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS planned_materials jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_logs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS postponement_history jsonb DEFAULT '[]'::jsonb;

-- Migrate data from json_content to columns
UPDATE projects SET
  code = json_content->>'code',
  description = json_content->>'description',
  detailed_description = json_content->>'detailedDescription',
  category = json_content->>'category',
  status = COALESCE(json_content->>'status', 'PLANNED'),
  reason_type = json_content->>'reasonType',
  reason = json_content->>'reason',
  responsible = json_content->>'responsible',
  cost_center = json_content->>'costCenter',
  location = json_content->>'location',
  area = json_content->>'area',
  city = json_content->>'city',
  start_date = (json_content->>'startDate')::date,
  estimated_end_date = (json_content->>'estimatedEndDate')::date,
  estimated_value = COALESCE((json_content->>'estimatedValue')::numeric, 0),
  sla_days = (json_content->>'slaDays')::integer,
  planned_services = COALESCE(json_content->'plannedServices', '[]'::jsonb),
  planned_materials = COALESCE(json_content->'plannedMaterials', '[]'::jsonb),
  audit_logs = COALESCE(json_content->'auditLogs', '[]'::jsonb),
  postponement_history = COALESCE(json_content->'postponementHistory', '[]'::jsonb)
WHERE json_content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_estimated_end_date ON projects(estimated_end_date);
CREATE INDEX IF NOT EXISTS idx_projects_responsible ON projects(responsible);