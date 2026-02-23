/*
  # Fix missing updated_at values in materials table
  
  1. Changes
    - Set updated_at to current timestamp for materials where updated_at is NULL
    - This ensures all materials have a valid updated_at timestamp
    
  2. Impact
    - Fixes 810 materials from Cropfert Jandaia that were missing updated_at
    - Ensures proper sorting and filtering of materials
*/

UPDATE materials 
SET updated_at = NOW()
WHERE updated_at IS NULL;