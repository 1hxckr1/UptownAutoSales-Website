/*
  # Implement Automatic Inventory Sync with HTTP Call (v3)

  1. Setup
    - Create internal_secrets table for CRON_SECRET
    - Generate a secure random secret for server-to-server auth
  
  2. Database Function
    - Drop and recreate trigger_inventory_sync() to actually call Edge Function
    - Use pg_net.http_post() to make HTTP request to inventory-sync-run
    - Pass X-Cron-Secret header for authentication
    - Handle response and return status
  
  3. Security
    - Cron secret stored in internal table with RLS enabled
    - Edge Function validates secret before processing
    - No user JWT required for cron path
*/

-- Create internal secrets table (simple key-value store)
CREATE TABLE IF NOT EXISTS internal_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS to protect secrets
ALTER TABLE internal_secrets ENABLE ROW LEVEL SECURITY;

-- No policies - only superuser/service role can access
-- This ensures browser clients cannot read secrets

-- Generate and store the cron secret (32 chars base64 = ~24 bytes)
INSERT INTO internal_secrets (key, value)
VALUES (
  'INTERNAL_CRON_SECRET',
  encode(gen_random_bytes(24), 'base64')
)
ON CONFLICT (key) DO NOTHING;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS trigger_inventory_sync();

-- Create new trigger_inventory_sync function to actually call the Edge Function
CREATE FUNCTION trigger_inventory_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cron_secret text;
  supabase_url text := 'https://apaaabypiufsboprsqvn.supabase.co';
  edge_function_url text;
  request_id bigint;
BEGIN
  -- Get the cron secret from internal_secrets table
  SELECT value INTO cron_secret
  FROM internal_secrets
  WHERE key = 'INTERNAL_CRON_SECRET';

  IF cron_secret IS NULL THEN
    RAISE EXCEPTION 'INTERNAL_CRON_SECRET not found';
  END IF;

  -- Construct Edge Function URL
  edge_function_url := supabase_url || '/functions/v1/inventory-sync-run';

  -- Log the attempt
  RAISE NOTICE 'Triggering inventory sync via pg_net to %', edge_function_url;

  -- Make HTTP POST request to Edge Function
  SELECT INTO request_id net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', cron_secret
    ),
    body := jsonb_build_object(
      'trigger_source', 'cron',
      'timestamp', extract(epoch from now())
    )
  );

  -- Return success with request ID
  RETURN jsonb_build_object(
    'success', true,
    'message', 'HTTP request initiated via pg_net',
    'request_id', request_id,
    'edge_function_url', edge_function_url,
    'timestamp', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error in trigger_inventory_sync: % %', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'timestamp', now()
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_inventory_sync() TO postgres;

-- Add comment
COMMENT ON FUNCTION trigger_inventory_sync() IS 'Triggers inventory sync by calling Edge Function via pg_net with cron authentication';
COMMENT ON TABLE internal_secrets IS 'Internal secrets storage for server-to-server authentication (RLS protected)';
