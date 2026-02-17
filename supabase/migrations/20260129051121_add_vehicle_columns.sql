/*
  # Add missing vehicle columns

  1. Changes
    - Add `notes` column to vehicles table for additional internal notes
    - Add `mpg` jsonb column to vehicles table for fuel economy data (city/highway)

  2. Notes
    - These columns support additional vehicle details that may come from Fender-AI
    - Both columns are nullable and have sensible defaults
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN notes text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'mpg'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN mpg jsonb DEFAULT NULL;
  END IF;
END $$;