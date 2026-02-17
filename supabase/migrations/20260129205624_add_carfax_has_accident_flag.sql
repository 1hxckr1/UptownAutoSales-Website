/*
  # Add CARFAX Has Accident Flag

  1. New Column
    - `carfax_has_accident` (boolean) - Indicates vehicle has reported accidents/damage
  
  2. Purpose
    - Enable strict accident detection logic
    - Differentiate between "no accidents", "has accidents", and "unknown"
    - Default to false (unknown state)
  
  3. Logic Rules
    - has_accident = true: Report explicitly mentions accidents
    - no_accidents = true: Report explicitly confirms no accidents
    - Both false: Unknown/unconfirmed status (show nothing)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_has_accident'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_has_accident boolean DEFAULT false;
  END IF;
END $$;