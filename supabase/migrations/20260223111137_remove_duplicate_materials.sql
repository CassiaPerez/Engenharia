/*
  # Remove duplicate materials
  
  1. Changes
    - Delete duplicate materials keeping only the first occurrence based on ID
    - Duplicates identified by same code, description, and location
    
  2. Impact
    - Removes 2 duplicate materials (codes: 1006856, P0671)
    - Ensures data integrity with unique materials per code/location
*/

DELETE FROM materials
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY code, description, location ORDER BY id) AS rn
    FROM materials
  ) sub
  WHERE rn > 1
);