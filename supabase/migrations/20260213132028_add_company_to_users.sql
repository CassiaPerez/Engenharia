/*
  # Add company field to users

  1. Changes
    - Add `company` field to all existing users in the database
    - Populate company based on email domain for existing users:
      - @cropbio.com.br or @genomabio.com.br → "Cropbio"
      - @cropfert.com.br → "Cropfert do Brasil"
      - Others → null (admin/general users)
  
  2. Notes
    - This is a data migration to add company affiliation to users
    - Non-admin users will see their company's equipment by default
*/

-- Update users with company field based on email domain
UPDATE users
SET json_content = jsonb_set(
  json_content,
  '{company}',
  CASE
    WHEN json_content->>'email' LIKE '%@cropbio.com.br' OR json_content->>'email' LIKE '%@genomabio.com.br' THEN '"Cropbio"'
    WHEN json_content->>'email' LIKE '%@cropfert.com.br' THEN '"Cropfert do Brasil"'
    ELSE 'null'
  END::jsonb
)
WHERE json_content->>'company' IS NULL;