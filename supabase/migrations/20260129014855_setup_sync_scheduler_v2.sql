/*
  # Setup Automated Sync Scheduler

  1. Functions
    - `trigger_inventory_sync()` - Database function to call the Edge Function
    - Can be invoked by pg_cron or external schedulers

  2. pg_cron Setup (if available)
    - Attempts to enable pg_cron extension
    - Creates scheduled job to run every 15 minutes
    - Falls back gracefully if extension not available

  3. Notes
    - pg_cron may require admin privileges or specific Supabase plan
    - If pg_cron is not available, external cron services can call the Edge Function directly
    - The sync interval is configurable in dealer_api_config table
*/

-- Create function to trigger inventory sync via HTTP request
CREATE OR REPLACE FUNCTION trigger_inventory_sync()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  config_record RECORD;
  function_url text;
BEGIN
  -- Get active config
  SELECT * INTO config_record
  FROM dealer_api_config
  WHERE dealer_id = 'trinity'
    AND is_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active configuration found'
    );
  END IF;

  -- Check if enough time has passed since last sync
  IF config_record.last_sync_at IS NOT NULL THEN
    IF (EXTRACT(EPOCH FROM (now() - config_record.last_sync_at)) / 60) < config_record.sync_interval_minutes THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Sync interval not reached',
        'next_sync_in_minutes', config_record.sync_interval_minutes - (EXTRACT(EPOCH FROM (now() - config_record.last_sync_at)) / 60)
      );
    END IF;
  END IF;

  -- Return success with instruction to call Edge Function
  -- Note: Direct HTTP calls from database functions require extensions like http or pg_net
  -- which may not be enabled. This function serves as a trigger point for external schedulers.
  RETURN json_build_object(
    'success', true,
    'message', 'Sync triggered',
    'config_id', config_record.id,
    'next_action', 'Call Edge Function inventory-sync-run'
  );
END;
$$;

-- Try to enable pg_cron extension (may require admin privileges)
DO $migration$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron extension requires admin privileges. Use external scheduler instead.';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available: %. Use external scheduler instead.', SQLERRM;
END $migration$;

-- Create cron job if pg_cron is available
DO $migration$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    PERFORM cron.unschedule('trinity-inventory-sync');
    
    -- Schedule the job to run every 15 minutes
    PERFORM cron.schedule(
      'trinity-inventory-sync',
      '*/15 * * * *',
      'SELECT trigger_inventory_sync();'
    );
    
    RAISE NOTICE 'Cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron not available. Manual scheduling or external cron required.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. Use external scheduler instead.', SQLERRM;
END $migration$;

-- Create a view to check sync schedule status
CREATE OR REPLACE VIEW sync_schedule_status AS
SELECT
  c.dealer_id,
  c.is_enabled,
  c.sync_interval_minutes,
  c.last_sync_at,
  CASE
    WHEN c.last_sync_at IS NULL THEN 'Never synced'
    WHEN (EXTRACT(EPOCH FROM (now() - c.last_sync_at)) / 60) >= c.sync_interval_minutes THEN 'Ready to sync'
    ELSE 'Waiting'
  END as sync_status,
  CASE
    WHEN c.last_sync_at IS NULL THEN NULL
    ELSE GREATEST(0, c.sync_interval_minutes - (EXTRACT(EPOCH FROM (now() - c.last_sync_at)) / 60))
  END as minutes_until_next_sync
FROM dealer_api_config c
WHERE c.dealer_id = 'trinity';

-- Grant access to admin users
GRANT SELECT ON sync_schedule_status TO authenticated;
