/*
  # Add CARFAX Value Rating Column

  1. New Column
    - `carfax_value_rating` (text) - Stores CARFAX value verdict: 'great', 'good', 'fair', or null
  
  2. Purpose
    - Surface CARFAX pricing value assessments to customers
    - Only display when explicitly provided by CARFAX
    - Default to null (no rating/unknown)
  
  3. Valid Values
    - 'great': Great Value (best deal)
    - 'good': Good Value (fair pricing)
    - 'fair': Fair Value (higher pricing)
    - null: No rating available or CARFAX didn't provide assessment
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'carfax_value_rating'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN carfax_value_rating text DEFAULT null;
  END IF;
END $$;