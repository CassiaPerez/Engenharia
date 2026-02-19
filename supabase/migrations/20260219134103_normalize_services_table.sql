/*
  # Normalize services table structure

  ## Description
  Convert json_content fields to proper columns.

  ## Changes
  1. New Columns
    - `name` (text) - Service name
    - `description` (text) - Service description
    - `category` (text) - Service category (INTERNAL, EXTERNAL)
    - `team` (text) - Team responsible
    - `cost_type` (text) - Cost type (Por Hora, Fixo, etc)
    - `unit_value` (numeric) - Unit value/cost

  2. Data Migration
    - Extract all fields from json_content

  3. Indexes
    - Add indexes on name, category

  4. Performance
    - Faster service lookups and filtering
*/

-- Add new columns
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS team text,
  ADD COLUMN IF NOT EXISTS cost_type text,
  ADD COLUMN IF NOT EXISTS unit_value numeric DEFAULT 0;

-- Migrate data from json_content to columns
UPDATE services SET
  name = json_content->>'name',
  description = json_content->>'description',
  category = json_content->>'category',
  team = json_content->>'team',
  cost_type = json_content->>'costType',
  unit_value = COALESCE((json_content->>'unitValue')::numeric, 0)
WHERE json_content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_team ON services(team);