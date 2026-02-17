/*
  # Add Sync Trigger Tracking

  1. Changes to sync_history table
    - Add `trigger_source` column (text: 'manual' or 'cron')
    - Add `invoked_by_user_id` column (uuid, nullable, references auth.users)
  
  2. Data Migration
    - Backfill existing records with trigger_source='manual'
  
  3. Purpose
    - Track whether sync was triggered manually (admin UI) or automatically (cron)
    - Record which admin user triggered manual syncs
    - Enable verification that auto-sync is working (15-minute cadence)
*/

-- Add trigger_source column
ALTER TABLE sync_history 
ADD COLUMN IF NOT EXISTS trigger_source text NOT NULL DEFAULT 'manual'
CHECK (trigger_source IN ('manual', 'cron'));

-- Add invoked_by_user_id column
ALTER TABLE sync_history 
ADD COLUMN IF NOT EXISTS invoked_by_user_id uuid REFERENCES auth.users(id);

-- Backfill existing records as manual triggers
UPDATE sync_history 
SET trigger_source = 'manual' 
WHERE trigger_source IS NULL OR trigger_source = 'manual';

-- Add helpful comment
COMMENT ON COLUMN sync_history.trigger_source IS 'Source of sync trigger: manual (admin UI) or cron (automatic 15-min schedule)';
COMMENT ON COLUMN sync_history.invoked_by_user_id IS 'ID of admin user who triggered manual sync, NULL for cron-triggered syncs';
