/*
  # Fix Vehicle is_active Column Defaults and Backfill

  1. Changes
    - Backfill all existing vehicles to is_active = true
    - Set column default to true for future records
    - Add NOT NULL constraint for data integrity
  
  2. Rationale
    - Currently 8/9 vehicles have is_active=false causing website to show only 1 vehicle
    - All vehicles should be visible by default unless explicitly disabled by admin
    - Future syncs and manual inserts should default to active
  
  3. Security
    - No RLS changes needed (existing policies remain)
*/

-- Backfill: Set all inactive vehicles to active
UPDATE vehicles 
SET is_active = true 
WHERE is_active = false;

-- Set column default to true for future inserts
ALTER TABLE vehicles 
ALTER COLUMN is_active SET DEFAULT true;

-- Add NOT NULL constraint for data integrity
ALTER TABLE vehicles 
ALTER COLUMN is_active SET NOT NULL;
