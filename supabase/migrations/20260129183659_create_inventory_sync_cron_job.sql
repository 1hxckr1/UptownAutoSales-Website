/*
  # Create Automatic Inventory Sync Cron Job

  1. Overview
    - Creates a pg_cron job to automatically sync inventory every 15 minutes
    - Calls the inventory-sync-run edge function to perform the sync
    - Ensures continuous inventory updates without manual intervention

  2. Cron Job Details
    - Schedule: Every 15 minutes
    - Job Name: inventory-sync-15min
    - Action: Calls the inventory-sync-run edge function via HTTP POST
    - Uses pg_net extension to make HTTP requests

  3. Important Notes
    - The cron job will only run when dealer_api_config.is_enabled is true
    - Edge function handles all sync logic, logging, and error handling
    - Sync interval can be adjusted by modifying the cron schedule
*/

-- Ensure pg_net extension is enabled (required for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing inventory sync cron jobs to avoid duplicates
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobid FROM cron.job WHERE jobname LIKE '%inventory%sync%'
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
END $$;

-- Create the cron job to run inventory sync every 15 minutes
SELECT cron.schedule(
  'inventory-sync-15min',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/inventory-sync-run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
