/*
  # Normalize materials table structure

  ## Description
  Convert json_content fields to proper columns for inventory management.

  ## Changes
  1. New Columns
    - `code` (text) - Material code (e.g., P0113)
    - `description` (text) - Material description
    - `unit` (text) - Unit of measure (Un, Kg, L, etc)
    - `group` (text) - Material group/category
    - `location` (text) - Storage location
    - `status` (text) - Status (ACTIVE, INACTIVE)
    - `current_stock` (numeric) - Current stock quantity
    - `min_stock` (numeric) - Minimum stock level
    - `unit_cost` (numeric) - Unit cost
    - `stock_locations` (jsonb) - Array of stock locations (keep as JSONB)

  2. Data Migration
    - Extract all scalar fields from json_content
    - Keep stock_locations as JSONB for flexibility

  3. Indexes
    - Add indexes on code, description, location, status
    - Add index on current_stock for low stock alerts

  4. Performance
    - Faster inventory queries and reporting
*/

-- Add new columns
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS "group" text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS current_stock numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_locations jsonb DEFAULT '[]'::jsonb;

-- Migrate data from json_content to columns
UPDATE materials SET
  code = json_content->>'code',
  description = json_content->>'description',
  unit = json_content->>'unit',
  "group" = json_content->>'group',
  location = json_content->>'location',
  status = COALESCE(json_content->>'status', 'ACTIVE'),
  current_stock = COALESCE((json_content->>'currentStock')::numeric, 0),
  min_stock = COALESCE((json_content->>'minStock')::numeric, 0),
  unit_cost = COALESCE((json_content->>'unitCost')::numeric, 0),
  stock_locations = COALESCE(json_content->'stockLocations', '[]'::jsonb)
WHERE json_content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_description ON materials(description);
CREATE INDEX IF NOT EXISTS idx_materials_location ON materials(location);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_group ON materials("group");
CREATE INDEX IF NOT EXISTS idx_materials_current_stock ON materials(current_stock);

-- Add index for low stock alerts
CREATE INDEX IF NOT EXISTS idx_materials_low_stock ON materials(current_stock, min_stock) 
  WHERE current_stock <= min_stock;