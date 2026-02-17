/*
  # Fix Cron Job with Proper Supabase URL

  1. Overview
    - Recreates the inventory sync cron job with the correct Supabase URL
    - Creates a helper function to trigger the inventory sync edge function
    - Ensures the cron job can successfully call the edge function

  2. Changes Made
    - Drops and recreates trigger_inventory_sync() function
    - Updates cron job to call this function
    - Uses hardcoded Supabase project URL for reliability

  3. Important Notes
    - Function uses pg_net to make HTTP POST to the edge function
    - Cron job runs every 15 minutes automatically
    - Edge function handles all authentication and sync logic
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS trigger_inventory_sync();

-- Create a function to trigger the inventory sync edge function
CREATE FUNCTION trigger_inventory_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text := 'https://apaaabypiufsboprsqvn.supabase.co';
  request_id bigint;
BEGIN
  -- Make HTTP request to trigger the sync edge function
  SELECT INTO request_id net.http_post(
    url := supabase_url || '/functions/v1/inventory-sync-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  
  -- Log that we triggered the sync
  RAISE NOTICE 'Triggered inventory sync via edge function, request_id: %', request_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error triggering inventory sync: %', SQLERRM;
END;
$$;

-- Update the cron job to use our new function
DO $$
BEGIN
  PERFORM cron.unschedule('inventory-sync-15min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'inventory-sync-15min',
  '*/15 * * * *',
  'SELECT trigger_inventory_sync();'
);
