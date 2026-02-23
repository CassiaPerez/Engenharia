/*
  # Add manual cost fields to OS and Projects
  
  1. Changes
    - Add manual_material_cost to oss table for custom material costs
    - Add manual_service_cost to oss table for custom service costs
    - Add manual_material_cost to projects table for custom material costs
    - Add manual_service_cost to projects table for custom service costs
    
  2. Details
    - Manual costs are optional (nullable)
    - When set, these override calculated hourly costs
    - Stored as numeric with 2 decimal places for currency
*/

-- Add manual cost fields to oss table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oss' AND column_name = 'manual_material_cost'
  ) THEN
    ALTER TABLE oss ADD COLUMN manual_material_cost numeric(10,2) DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oss' AND column_name = 'manual_service_cost'
  ) THEN
    ALTER TABLE oss ADD COLUMN manual_service_cost numeric(10,2) DEFAULT NULL;
  END IF;
END $$;

-- Add manual cost fields to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'manual_material_cost'
  ) THEN
    ALTER TABLE projects ADD COLUMN manual_material_cost numeric(10,2) DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'manual_service_cost'
  ) THEN
    ALTER TABLE projects ADD COLUMN manual_service_cost numeric(10,2) DEFAULT NULL;
  END IF;
END $$;