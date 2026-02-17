/*
  # Add Public API Key and Usage Logging

  1. Updates to Existing Tables
    - `dealer_api_config`
      - Add `public_api_key` (text, unique) - Public API key for external access
      
  2. New Tables
    - `api_usage_logs`
      - `id` (uuid, primary key)
      - `dealer_id` (text) - Which dealer made the request
      - `endpoint` (text) - API endpoint called
      - `method` (text) - HTTP method
      - `timestamp` (timestamptz) - When the request was made

  3. Security
    - Enable RLS on api_usage_logs table
    - Only authenticated admins can view usage logs
*/

-- Add public_api_key column to dealer_api_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealer_api_config' AND column_name = 'public_api_key'
  ) THEN
    ALTER TABLE dealer_api_config ADD COLUMN public_api_key text UNIQUE;
  END IF;
END $$;

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id text NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated admins can view usage logs
CREATE POLICY "Admins can view API usage logs"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_dealer_id ON api_usage_logs(dealer_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp DESC);