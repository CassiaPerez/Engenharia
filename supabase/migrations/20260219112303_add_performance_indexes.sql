/*
  # Add Performance Indexes

  1. Performance Improvements
    - Add index on materials(id) for faster lookups
    - Add index on oss(id) for faster lookups
    - Add GIN index on materials json_content for faster JSON queries
    - Add GIN index on oss json_content for faster JSON queries

  2. Notes
    - These indexes will significantly improve query performance
    - GIN indexes are ideal for JSONB columns
    - Uses IF NOT EXISTS to prevent errors on re-run
*/

-- Add index on materials id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'materials' AND indexname = 'idx_materials_id'
  ) THEN
    CREATE INDEX idx_materials_id ON materials(id);
  END IF;
END $$;

-- Add GIN index on materials json_content for faster JSON queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'materials' AND indexname = 'idx_materials_json_content'
  ) THEN
    CREATE INDEX idx_materials_json_content ON materials USING GIN (json_content);
  END IF;
END $$;

-- Add index on oss id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'oss' AND indexname = 'idx_oss_id'
  ) THEN
    CREATE INDEX idx_oss_id ON oss(id);
  END IF;
END $$;

-- Add GIN index on oss json_content for faster JSON queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'oss' AND indexname = 'idx_oss_json_content'
  ) THEN
    CREATE INDEX idx_oss_json_content ON oss USING GIN (json_content);
  END IF;
END $$;
