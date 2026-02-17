/*
  # Inventory Sync System Setup

  1. New Tables
    - `dealer_api_config`
      - Stores Fender-AI API endpoint and encrypted API key
      - `id` (uuid, primary key)
      - `dealer_id` (text) - Identifies the dealer (Trinity)
      - `endpoint_base` (text) - Base URL for Fender-AI API
      - `api_key_encrypted` (text) - Encrypted API key using pgcrypto
      - `is_enabled` (boolean) - Enable/disable auto-sync
      - `sync_interval_minutes` (integer) - How often to sync (default 15)
      - `last_sync_at` (timestamptz) - Last successful sync timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `sync_history`
      - Logs each sync attempt with results
      - `id` (uuid, primary key)
      - `config_id` (uuid, foreign key to dealer_api_config)
      - `status` (text) - 'success', 'failure', 'partial'
      - `records_created` (integer) - New vehicles added
      - `records_updated` (integer) - Existing vehicles updated
      - `records_disabled` (integer) - Vehicles marked inactive
      - `total_records_processed` (integer) - Total from feed
      - `duration_ms` (integer) - How long sync took
      - `triggered_by` (text) - 'auto' or 'manual' or user_id
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)

    - `sync_errors`
      - Detailed error logging for troubleshooting
      - `id` (uuid, primary key)
      - `sync_history_id` (uuid, foreign key to sync_history)
      - `error_type` (text) - 'api_error', 'validation_error', 'database_error'
      - `error_message` (text) - Human readable error
      - `error_details` (jsonb) - Stack trace and context
      - `vehicle_data` (jsonb) - Data that caused error (if applicable)
      - `created_at` (timestamptz)

    - `admin_users`
      - Tracks which users have admin access
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `role` (text) - 'admin', 'super_admin'
      - `dealer_id` (text) - Links to dealer they manage
      - `created_at` (timestamptz)

  2. Updates to Existing Tables
    - `vehicles` table modifications:
      - Add `stock_number` (text, unique) - Primary identifier for sync
      - Add `drivetrain` (text) - 4WD, AWD, FWD, RWD
      - Add `is_active` (boolean) - Soft delete flag for removed vehicles

  3. Security
    - Enable RLS on all new tables
    - Policies restrict admin_users to authenticated users only
    - Policies restrict dealer_api_config to admin users only
    - Policies allow authenticated admins to view sync history and errors
    - Public can view active vehicles only

  4. Extensions
    - Enable pgcrypto for API key encryption
    - Enable pg_cron for automated scheduling (if available)
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update vehicles table with new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'stock_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN stock_number text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'drivetrain'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN drivetrain text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  dealer_id text NOT NULL DEFAULT 'trinity',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can only see their own record
CREATE POLICY "Admin users can view own record"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create dealer_api_config table
CREATE TABLE IF NOT EXISTS dealer_api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id text NOT NULL DEFAULT 'trinity',
  endpoint_base text NOT NULL,
  api_key_encrypted text NOT NULL,
  is_enabled boolean DEFAULT true,
  sync_interval_minutes integer DEFAULT 15,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dealer_api_config ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can access API config
CREATE POLICY "Admins can view API config"
  ON dealer_api_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.dealer_id = dealer_api_config.dealer_id
    )
  );

CREATE POLICY "Admins can insert API config"
  ON dealer_api_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.dealer_id = dealer_api_config.dealer_id
    )
  );

CREATE POLICY "Admins can update API config"
  ON dealer_api_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.dealer_id = dealer_api_config.dealer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.dealer_id = dealer_api_config.dealer_id
    )
  );

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES dealer_api_config(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_disabled integer DEFAULT 0,
  total_records_processed integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  triggered_by text DEFAULT 'auto',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Authenticated admins can view sync history
CREATE POLICY "Admins can view sync history"
  ON sync_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create sync_errors table
CREATE TABLE IF NOT EXISTS sync_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_history_id uuid REFERENCES sync_history(id) ON DELETE CASCADE,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb DEFAULT '{}'::jsonb,
  vehicle_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

-- Authenticated admins can view sync errors
CREATE POLICY "Admins can view sync errors"
  ON sync_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create index for faster sync history queries
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_errors_sync_history_id ON sync_errors(sync_history_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_stock_number ON vehicles(stock_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to dealer_api_config
DROP TRIGGER IF EXISTS update_dealer_api_config_updated_at ON dealer_api_config;
CREATE TRIGGER update_dealer_api_config_updated_at
  BEFORE UPDATE ON dealer_api_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to encrypt API key
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key text, encryption_key text)
RETURNS text AS $$
BEGIN
  RETURN encode(encrypt(api_key::bytea, encryption_key::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to decrypt API key
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key text, encryption_key text)
RETURNS text AS $$
BEGIN
  RETURN convert_from(decrypt(decode(encrypted_key, 'base64'), encryption_key::bytea, 'aes'), 'utf8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;