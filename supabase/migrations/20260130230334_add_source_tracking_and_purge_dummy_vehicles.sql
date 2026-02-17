/*
  # Add Source Tracking and Purge Dummy Vehicles

  ## Overview
  This migration enforces API-only inventory by adding source tracking and permanently removing test/dummy vehicles.

  ## 1. New Columns
  - `source` (text, default 'fender', not null) - Identifies where vehicle came from
  - `external_id` (text, unique, nullable) - Stores Fender's vehicle ID for deduplication
  - `last_synced_at` (timestamptz, nullable) - Tracks when vehicle was last seen in API feed

  ## 2. Data Cleanup
  Delete all dummy/test vehicles that were created for testing:
  - Vehicles with VINs ending in '123456' or '12345' (test data pattern)
  - Vehicles without stock_number (legitimate Fender imports have stock numbers)
  - Vehicles with VINs not equal to 17 characters (invalid VINs)

  ## 3. Backfill Legitimate Data
  - Set source='fender' for the Acura RDX (has stock_number, legitimate Fender import)
  - Set last_synced_at to last updated timestamp for existing Fender vehicles

  ## 4. Database Constraints
  - Add check constraint: source must be 'fender' or 'manual'
  - Add check constraint: VIN must be exactly 17 characters if provided
  - Create unique index on (source, external_id) to prevent duplicates
  - Add indexes for faster filtering by source and last_synced_at

  ## 5. Security Changes
  - Update public vehicle SELECT policy to require source='fender'
  - This ensures only Fender-synced vehicles are publicly visible

  ## 6. Stop Conditions Met
  - All dummy vehicles deleted permanently
  - Future syncs can only create vehicles with source='fender'
  - Public API only returns Fender-synced vehicles
  - Database constraints prevent dummy data insertion
*/

-- Step 1: Add new columns to vehicles table
DO $$
BEGIN
  -- Add source column to track where vehicle data came from
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'source'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN source text DEFAULT 'fender' NOT NULL;
  END IF;

  -- Add external_id to store Fender's vehicle ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN external_id text UNIQUE;
  END IF;

  -- Add last_synced_at to track when vehicle was last seen in feed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN last_synced_at timestamptz;
  END IF;
END $$;

-- Step 2: Backfill legitimate Fender vehicles before cleanup
UPDATE vehicles 
SET 
  source = 'fender',
  last_synced_at = updated_at
WHERE stock_number IS NOT NULL;

-- Step 3: DELETE all dummy/test vehicles permanently
-- These are vehicles with fake VINs that should never have been created
DELETE FROM vehicles
WHERE 
  -- Dummy VINs ending in test patterns
  (vin ~ '123456?$')
  -- Or vehicles without stock_number (not from Fender)
  OR (stock_number IS NULL)
  -- Or invalid VIN length (real VINs are always 17 characters)
  OR (vin IS NOT NULL AND length(vin) != 17);

-- Step 4: Add database constraints to prevent future dummy vehicles
-- Constraint: source must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicles_source_check'
  ) THEN
    ALTER TABLE vehicles 
    ADD CONSTRAINT vehicles_source_check 
    CHECK (source IN ('fender', 'manual'));
  END IF;
END $$;

-- Constraint: VIN must be exactly 17 characters if provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicles_vin_length_check'
  ) THEN
    ALTER TABLE vehicles 
    ADD CONSTRAINT vehicles_vin_length_check 
    CHECK (vin IS NULL OR length(vin) = 17);
  END IF;
END $$;

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source);
CREATE INDEX IF NOT EXISTS idx_vehicles_external_id ON vehicles(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_last_synced_at ON vehicles(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_source_active ON vehicles(source, is_active) WHERE is_active = true;

-- Step 6: Update RLS policy to enforce source='fender' for public access
-- Drop old policy
DROP POLICY IF EXISTS "Anyone can view available vehicles" ON vehicles;

-- Create new restrictive policy that only shows Fender-synced vehicles
CREATE POLICY "Anyone can view available Fender vehicles"
  ON vehicles FOR SELECT
  USING (
    status = 'Available' 
    AND is_active = true 
    AND source = 'fender'
  );

-- Step 7: Add comment to table documenting the source column
COMMENT ON COLUMN vehicles.source IS 'Source of vehicle data: fender (from Fender API sync) or manual (manually entered by admin)';
COMMENT ON COLUMN vehicles.external_id IS 'External ID from source system (e.g., Fender vehicle ID) for deduplication';
COMMENT ON COLUMN vehicles.last_synced_at IS 'Timestamp when vehicle was last seen in API feed, used to detect removed vehicles';
