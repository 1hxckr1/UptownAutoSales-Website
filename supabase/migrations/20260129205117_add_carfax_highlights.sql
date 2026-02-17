/*
  # Add CARFAX Highlights Fields

  1. New Columns
    - `carfax_no_accidents` (boolean) - Indicates vehicle has no accident history
    - `carfax_one_owner` (boolean) - Indicates vehicle has had only one owner
    - `carfax_well_maintained` (boolean) - Indicates vehicle has good service history
    - `carfax_service_records_count` (integer) - Number of service records on file
    - `carfax_great_reliability` (boolean) - Indicates vehicle has strong reliability rating
  
  2. Purpose
    - Enable display of CARFAX highlights on vehicle detail pages
    - Provide at-a-glance vehicle history information
    - All fields default to false/0 to avoid null handling
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_no_accidents'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_no_accidents boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_one_owner'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_one_owner boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_well_maintained'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_well_maintained boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_service_records_count'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_service_records_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_great_reliability'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_great_reliability boolean DEFAULT false;
  END IF;
END $$;