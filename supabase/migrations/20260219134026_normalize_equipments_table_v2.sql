/*
  # Normalize equipments table structure (v2)

  ## Description
  Convert json_content fields to proper columns for better performance.
  Note: Skipping unique constraint on code due to existing duplicates.

  ## Changes
  1. New Columns
    - `code` (text) - Equipment code (e.g., VAP-01)
    - `name` (text) - Equipment name
    - `description` (text) - Equipment description
    - `manufacturer` (text) - Manufacturer name
    - `model` (text) - Model number
    - `serial_number` (text) - Serial number
    - `location` (text) - Physical location
    - `status` (text) - Status (ACTIVE, INACTIVE, MAINTENANCE)
    - `notes` (text) - Additional notes

  2. Data Migration
    - Extract all fields from json_content

  3. Indexes
    - Add indexes on code, name, location, status

  4. Performance
    - Faster equipment searches and filtering
*/

-- Add new columns
ALTER TABLE equipments
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes text;

-- Migrate data from json_content to columns
UPDATE equipments SET
  code = json_content->>'code',
  name = json_content->>'name',
  description = json_content->>'description',
  manufacturer = json_content->>'manufacturer',
  model = json_content->>'model',
  serial_number = json_content->>'serialNumber',
  location = json_content->>'location',
  status = COALESCE(json_content->>'status', 'ACTIVE'),
  notes = json_content->>'notes'
WHERE json_content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipments_code ON equipments(code);
CREATE INDEX IF NOT EXISTS idx_equipments_name ON equipments(name);
CREATE INDEX IF NOT EXISTS idx_equipments_location ON equipments(location);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments(status);
CREATE INDEX IF NOT EXISTS idx_equipments_manufacturer ON equipments(manufacturer);