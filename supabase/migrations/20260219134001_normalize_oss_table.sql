/*
  # Normalize OSs table structure

  ## Description
  Convert json_content fields to proper columns for better query performance.
  This is critical for resolving timeout issues with large OS records.

  ## Changes
  1. New Columns
    - `number` (text) - OS number (e.g., OS-7126)
    - `type` (text) - Type of OS (Preventiva, Corretiva, etc)
    - `status` (text) - OS status (OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
    - `priority` (text) - Priority level (LOW, MEDIUM, HIGH, CRITICAL)
    - `description` (text) - OS description
    - `equipment_id` (text) - Related equipment ID
    - `cost_center` (text) - Cost center code
    - `open_date` (timestamptz) - When OS was opened
    - `limit_date` (timestamptz) - Deadline for completion
    - `close_date` (timestamptz) - When OS was completed
    - `sla_hours` (integer) - SLA in hours
    - `executor_ids` (text[]) - Array of executor user IDs
    - `requester_id` (text) - ID of user who requested the OS
    - `services` (jsonb) - Services array (keep as JSONB for flexibility)
    - `materials` (jsonb) - Materials array (keep as JSONB for flexibility)

  2. Data Migration
    - Extract scalar fields from json_content
    - Keep complex arrays as JSONB for now

  3. Indexes
    - Add indexes on frequently queried fields
    - Optimize for status, date, and equipment filters

  4. Performance
    - This will dramatically reduce data transfer size
    - Enable faster queries without loading full JSON
*/

-- Add new columns
ALTER TABLE oss
  ADD COLUMN IF NOT EXISTS number text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS equipment_id text,
  ADD COLUMN IF NOT EXISTS cost_center text,
  ADD COLUMN IF NOT EXISTS open_date timestamptz,
  ADD COLUMN IF NOT EXISTS limit_date timestamptz,
  ADD COLUMN IF NOT EXISTS close_date timestamptz,
  ADD COLUMN IF NOT EXISTS sla_hours integer,
  ADD COLUMN IF NOT EXISTS executor_ids text[],
  ADD COLUMN IF NOT EXISTS requester_id text,
  ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb;

-- Migrate data from json_content to columns
UPDATE oss SET
  number = json_content->>'number',
  type = json_content->>'type',
  status = COALESCE(json_content->>'status', 'OPEN'),
  priority = COALESCE(json_content->>'priority', 'MEDIUM'),
  description = json_content->>'description',
  equipment_id = json_content->>'equipmentId',
  cost_center = json_content->>'costCenter',
  open_date = (json_content->>'openDate')::timestamptz,
  limit_date = (json_content->>'limitDate')::timestamptz,
  close_date = (json_content->>'closeDate')::timestamptz,
  sla_hours = (json_content->>'slaHours')::integer,
  executor_ids = ARRAY(SELECT jsonb_array_elements_text(json_content->'executorIds')),
  requester_id = json_content->>'requesterId',
  services = COALESCE(json_content->'services', '[]'::jsonb),
  materials = COALESCE(json_content->'materials', '[]'::jsonb)
WHERE json_content IS NOT NULL;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_oss_number_normalized ON oss(number);
CREATE INDEX IF NOT EXISTS idx_oss_status_normalized ON oss(status);
CREATE INDEX IF NOT EXISTS idx_oss_type_normalized ON oss(type);
CREATE INDEX IF NOT EXISTS idx_oss_priority_normalized ON oss(priority);
CREATE INDEX IF NOT EXISTS idx_oss_equipment_id ON oss(equipment_id);
CREATE INDEX IF NOT EXISTS idx_oss_open_date ON oss(open_date DESC);
CREATE INDEX IF NOT EXISTS idx_oss_limit_date ON oss(limit_date);
CREATE INDEX IF NOT EXISTS idx_oss_executor_ids ON oss USING gin(executor_ids);
CREATE INDEX IF NOT EXISTS idx_oss_requester_id ON oss(requester_id);

-- Add unique constraint on OS number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oss_number_unique'
  ) THEN
    ALTER TABLE oss ADD CONSTRAINT oss_number_unique UNIQUE (number);
  END IF;
END $$;