/*
  # Normalize suppliers table structure

  ## Description
  Convert json_content fields to proper columns for supplier management.

  ## Changes
  1. New Columns
    - `name` (text) - Supplier name
    - `cnpj` (text) - CNPJ/Tax ID
    - `contact` (text) - Contact name
    - `phone` (text) - Phone number
    - `email` (text) - Email address
    - `address` (text) - Full address
    - `city` (text) - City
    - `state` (text) - State
    - `notes` (text) - Additional notes
    - `active` (boolean) - Whether supplier is active

  2. Data Migration
    - Extract all fields from json_content if any exist

  3. Indexes
    - Add indexes on name, cnpj, active

  4. Performance
    - Faster supplier searches and filtering
*/

-- Add new columns
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS contact text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Migrate data from json_content to columns (if any exists)
UPDATE suppliers SET
  name = json_content->>'name',
  cnpj = json_content->>'cnpj',
  contact = json_content->>'contact',
  phone = json_content->>'phone',
  email = json_content->>'email',
  address = json_content->>'address',
  city = json_content->>'city',
  state = json_content->>'state',
  notes = json_content->>'notes',
  active = COALESCE((json_content->>'active')::boolean, true)
WHERE json_content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON suppliers(cnpj);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);