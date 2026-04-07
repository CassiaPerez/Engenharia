/*
  # Fix OSs Table Performance with Optimized Indexes

  1. Performance Improvements
    - Add index on status column (heavily filtered)
    - Add index on executor_ids array (for executor filtering)
    - Add composite index on open_date DESC (for recent OSs)
    - Add indexes on foreign keys (project_id, building_id, equipment_id)
    
  2. Query Optimization
    - These indexes will dramatically speed up common queries
    - Especially important for executor panel and OS list views
    
  3. Notes
    - GIN index for array columns (executor_ids)
    - B-tree indexes for standard columns
*/

-- Drop existing indexes if they exist (idempotent)
DROP INDEX IF EXISTS idx_oss_status;
DROP INDEX IF EXISTS idx_oss_executor_ids;
DROP INDEX IF EXISTS idx_oss_open_date;
DROP INDEX IF EXISTS idx_oss_project_id;
DROP INDEX IF EXISTS idx_oss_building_id;
DROP INDEX IF EXISTS idx_oss_equipment_id;
DROP INDEX IF EXISTS idx_oss_requester_id;
DROP INDEX IF EXISTS idx_oss_status_open_date;

-- Add optimized indexes
CREATE INDEX idx_oss_status ON oss(status);
CREATE INDEX idx_oss_executor_ids ON oss USING GIN(executor_ids);
CREATE INDEX idx_oss_open_date ON oss(open_date DESC NULLS LAST);
CREATE INDEX idx_oss_project_id ON oss(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_oss_building_id ON oss(building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_oss_equipment_id ON oss(equipment_id) WHERE equipment_id IS NOT NULL;
CREATE INDEX idx_oss_requester_id ON oss(requester_id) WHERE requester_id IS NOT NULL;

-- Composite index for common query patterns (status + open_date)
CREATE INDEX idx_oss_status_open_date ON oss(status, open_date DESC NULLS LAST);

-- Analyze table to update statistics
ANALYZE oss;
