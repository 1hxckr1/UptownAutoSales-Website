/*
  # Add CARFAX Report URL Field

  1. New Column
    - `carfax_report_url` (text) - Stores link to CARFAX report for manual verification
  
  2. Purpose
    - Allows admins to store CARFAX report links for each vehicle
    - Enables manual verification of CARFAX highlights
    - Provides audit trail for data accuracy
  
  3. Important Notes
    - CARFAX data must be manually verified from actual CARFAX reports
    - Do not rely on automated parsing or inference
    - This field serves as the source of truth for CARFAX data verification
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_report_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_report_url text DEFAULT null;
  END IF;
END $$;
