/*
  # Create Dealer Information Table

  1. New Tables
    - `dealer_info`
      - `id` (uuid, primary key) - Unique identifier
      - `dealer_id` (text, unique) - Dealer identifier (default: 'trinity')
      - `name` (text) - Dealer name
      - `phone` (text) - Contact phone number
      - `email` (text) - Contact email
      - `address` (text) - Street address
      - `city` (text) - City
      - `state` (text) - State
      - `zip_code` (text) - ZIP code
      - `website_url` (text) - Website URL
      - `logo_url` (text) - Logo image URL
      - `primary_color` (text) - Brand primary color (hex)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `dealer_info` table
    - Add policy for public read access (anyone can view dealer info)
    - Add policy for admin write access (only admins can modify)

  3. Initial Data
    - Insert default Trinity Motors dealer information
*/

CREATE TABLE IF NOT EXISTS dealer_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id text UNIQUE NOT NULL DEFAULT 'trinity',
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip_code text NOT NULL DEFAULT '',
  website_url text DEFAULT '',
  logo_url text DEFAULT '',
  primary_color text DEFAULT '#1e40af',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dealer_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dealer info"
  ON dealer_info
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update dealer info"
  ON dealer_info
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert dealer info"
  ON dealer_info
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

INSERT INTO dealer_info (dealer_id, name, phone, email, address, city, state, zip_code, website_url)
VALUES (
  'trinity',
  'Trinity Motorcar Company',
  'Trinity Motorcar Company',
  'trinitymotorcarcj@gmail.com',
  '1300 Dean Avenue SE',
  'Rome',
  'GA',
  '30161',
  'https://honestcardeal.com'
)
ON CONFLICT (dealer_id) DO NOTHING;
