/*
  # Refresh Schema Cache
  
  This migration refreshes the PostgREST schema cache to ensure all tables are visible to the REST API.
  
  ## What it does
  - Adds comments to the equipments and role_permissions tables to trigger cache refresh
  - Forces PostgREST to reload the schema cache
  
  ## Why it's needed
  - Sometimes the PostgREST cache doesn't automatically update after migrations
  - This ensures the REST API recognizes all tables
*/

-- Add comments to trigger schema cache refresh
COMMENT ON TABLE equipments IS 'Equipment management table - stores industrial equipment data';
COMMENT ON TABLE role_permissions IS 'Role-based permissions configuration table';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';