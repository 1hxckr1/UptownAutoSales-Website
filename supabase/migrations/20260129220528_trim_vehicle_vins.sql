/*
  # Clean up vehicle VINs

  1. Data Cleanup
    - Trim whitespace from all VINs
    - Uppercase all VINs for consistency
    - Ensure VINs are stored in clean format
  
  2. Notes
    - This is a one-time cleanup to ensure CARFAX functionality works correctly
    - VINs must be exactly 17 characters for CARFAX validation
    - Removes any leading/trailing spaces that may have been imported
*/

-- Trim and uppercase all VINs in the vehicles table
UPDATE vehicles
SET vin = TRIM(UPPER(vin))
WHERE vin IS NOT NULL AND vin != TRIM(UPPER(vin));
