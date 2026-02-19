/*
  # Add Requester Fields to OS Table

  ## Changes
  
  1. **New Fields**
    - Add requester_id to track who opened the OS
    - Add requester_name for display purposes
  
  2. **Purpose**
    - Allow admins, managers, and executors to see who requested each OS
    - Enable better permission control for editing OS
    
  3. **Security**
    - No RLS changes needed (tables already have RLS enabled)
*/

-- Add requester fields to OS table (these fields will be stored in json_content)
-- No schema changes needed as we're using JSONB structure

-- Notify PostgREST to reload schema cache  
NOTIFY pgrst, 'reload schema';
