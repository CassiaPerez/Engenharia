/*
  # Normalize users table structure

  ## Description
  Convert json_content fields to proper columns for better performance and data integrity.

  ## Changes
  1. New Columns
    - `name` (text) - User's full name
    - `email` (text) - User's email address (unique)
    - `password` (text) - User's password (hashed)
    - `role` (text) - User role (EXECUTOR, MANAGER, ADMIN, REQUESTER)
    - `department` (text) - User's department
    - `avatar` (text) - User's avatar initials
    - `active` (boolean) - Whether user is active
    - `company` (text) - Company name (Cropbio, Cropfert, etc)

  2. Data Migration
    - Extract all fields from json_content into new columns
    - Preserve existing data

  3. Indexes
    - Add index on email for faster lookups
    - Add index on role for filtering
    - Add index on active status

  4. Security
    - Keep existing RLS policies intact
*/

-- Add new columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS password text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'EXECUTOR',
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS avatar text,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS company text;

-- Migrate data from json_content to columns
UPDATE users SET
  name = json_content->>'name',
  email = json_content->>'email',
  password = json_content->>'password',
  role = json_content->>'role',
  department = json_content->>'department',
  avatar = json_content->>'avatar',
  active = COALESCE((json_content->>'active')::boolean, true),
  company = json_content->>'company'
WHERE json_content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);

-- Add unique constraint on email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
END $$;