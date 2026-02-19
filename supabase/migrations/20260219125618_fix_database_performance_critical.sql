/*
  # Critical Database Performance Fix

  ## Issues Identified
  1. **Duplicate Indexes**: Multiple identical GIN indexes on same columns consuming double space
  2. **Unused Indexes**: Several indexes never used (idx_scan = 0) wasting 1.5+ MB
  3. **Missing Indexes**: No indexes on updated_at columns for ORDER BY optimization
  4. **Bloated OSS Table**: 43 MB indexes for only 25 rows (index bloat)

  ## Changes Made
  
  ### 1. Remove Duplicate Indexes
  - Drop `idx_materials_json_content` (duplicate of idx_materials_jsonb)
  - Drop `idx_oss_json_content` (duplicate of idx_oss_jsonb)
  
  ### 2. Remove Unused/Low-Value Indexes
  - Drop `idx_materials_description` (296 kB, never used, gin_trgm_ops)
  - Drop `idx_materials_code` (48 kB, never used, can use id index)
  - Drop `idx_materials_location` (32 kB, never used)
  - Drop `idx_materials_group` (32 kB, never used)
  - Drop `idx_projects_name` (24 kB, never used, gin_trgm_ops)
  - Drop `idx_equipments_type` (16 kB, never used)
  - Drop `idx_movements_material` (40 kB, never used)
  - Drop `idx_movements_type` (never used)
  
  ### 3. Add Performance Indexes
  - Add updated_at indexes for efficient ORDER BY queries
  
  ### 4. Security
  - No RLS changes (all tables already have RLS enabled)

  ## Expected Results
  - Reduce index storage by ~1.2 MB (50%+ reduction)
  - Improve query performance by reducing index overhead
  - Fix schema cache loading issues
  - Reduce write amplification (fewer indexes to update)
  
  ## Post-Migration Steps (run manually)
  - REINDEX tables to remove bloat
  - VACUUM ANALYZE to update statistics
  - Notify PostgREST to reload schema cache
*/

-- Remove duplicate indexes (CRITICAL)
DROP INDEX IF EXISTS idx_materials_json_content CASCADE;
DROP INDEX IF EXISTS idx_oss_json_content CASCADE;

-- Remove unused indexes to reduce overhead
DROP INDEX IF EXISTS idx_materials_description CASCADE;
DROP INDEX IF EXISTS idx_materials_code CASCADE;
DROP INDEX IF EXISTS idx_materials_location CASCADE;
DROP INDEX IF EXISTS idx_materials_group CASCADE;
DROP INDEX IF EXISTS idx_projects_name CASCADE;
DROP INDEX IF EXISTS idx_equipments_type CASCADE;
DROP INDEX IF EXISTS idx_movements_material CASCADE;
DROP INDEX IF EXISTS idx_movements_type CASCADE;

-- Add updated_at indexes for efficient ORDER BY queries
CREATE INDEX IF NOT EXISTS idx_materials_updated_at ON materials USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_oss_updated_at ON oss USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_updated_at ON stock_movements USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipments_updated_at ON equipments USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_buildings_updated_at ON buildings USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_updated_at ON services USING btree (updated_at DESC);
