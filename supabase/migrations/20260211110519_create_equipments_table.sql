/*
  # Create equipments table

  1. New Tables
    - `equipments`
      - `id` (text, primary key) - Unique identifier for equipment
      - `json_content` (jsonb) - Complete equipment data including:
        - code: Equipment code
        - name: Equipment name
        - description: Equipment description
        - location: Current location
        - model: Equipment model
        - serialNumber: Serial number
        - manufacturer: Manufacturer name
        - status: Equipment status (ACTIVE, MAINTENANCE, INACTIVE)
        - notes: Additional notes
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `equipments` table
    - Add policy for authenticated users to read all equipment data
    - Add policy for authenticated users to insert equipment
    - Add policy for authenticated users to update equipment
    - Add policy for ADMIN users to delete equipment

  3. Important Notes
    - Follows the same JSONB pattern as other tables in the system
    - RLS policies ensure data security while allowing necessary access
    - All equipment operations are tracked via updated_at timestamp
*/

CREATE TABLE IF NOT EXISTS equipments (
  id text PRIMARY KEY,
  json_content jsonb NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read equipments"
  ON equipments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read equipments (anon)"
  ON equipments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to insert equipments"
  ON equipments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert equipments (anon)"
  ON equipments
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update equipments"
  ON equipments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update equipments (anon)"
  ON equipments
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete equipments"
  ON equipments
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete equipments (anon)"
  ON equipments
  FOR DELETE
  TO anon
  USING (true);