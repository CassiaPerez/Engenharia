/*
  # Normalize buildings table structure

  ## Description
  Convert json_content fields to proper columns.

  ## Changes
  1. New Columns
    - `name` (text) - Building name
    - `type` (text) - Building type (CORPORATE, INDUSTRIAL, etc)
    - `address` (text) - Full address
    - `city` (text) - City name
    - `manager` (text) - Manager name
    - `notes` (text) - Additional notes

  2. Data Migration
    - Extract all fields from json_content

  3. Indexes
    - Add indexes on name, type, city

  4. Performance
    - Faster building searches and filtering
*/

-- Add new columns
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS manager text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Migrate data from json_content to columns
UPDATE buildings SET
  name = json_content->>'name',
  type = json_content->>'type',
  address = json_content->>'address',
  city = json_content->>'city',
  manager = json_content->>'manager',
  notes = json_content->>'notes'
WHERE json_content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(type);
CREATE INDEX IF NOT EXISTS idx_buildings_city ON buildings(city);