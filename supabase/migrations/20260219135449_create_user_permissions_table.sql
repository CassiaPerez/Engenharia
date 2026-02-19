/*
  # Create User Permissions Table

  ## Description
  Creates a granular permission system that allows setting custom permissions per user.
  Users inherit permissions from their role by default, but can have custom overrides.

  ## Changes
  
  1. New Tables
    - `user_permissions`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key to users)
      - `module` (text, the module name)
      - `permissions` (jsonb, contains view/create/edit/delete/export flags)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Constraints
    - Unique constraint on (user_id, module) to prevent duplicates
    - Foreign key to users table with CASCADE delete
  
  3. Indexes
    - Index on user_id for fast user permission lookups
    - Index on module for querying by module
  
  4. Security
    - Enable RLS on user_permissions table
    - Only authenticated users can view their own permissions
    - Only ADMIN role can create/update/delete user permissions
  
  5. Benefits
    - Granular control per user
    - Override role-based permissions when needed
    - Maintain role inheritance for simplicity
    - Easy to audit and manage
*/

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{"view": false, "create": false, "edit": false, "delete": false, "export": false}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint
ALTER TABLE user_permissions 
  ADD CONSTRAINT unique_user_module UNIQUE (user_id, module);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for user_permissions

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE email = current_user)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'ADMIN'
    )
  );

-- Only ADMIN can insert user permissions
CREATE POLICY "Only ADMIN can create permissions"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'ADMIN'
    )
  );

-- Only ADMIN can update user permissions
CREATE POLICY "Only ADMIN can update permissions"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'ADMIN'
    )
  );

-- Only ADMIN can delete user permissions
CREATE POLICY "Only ADMIN can delete permissions"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE email = current_user 
      AND role = 'ADMIN'
    )
  );

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_permissions_updated_at();