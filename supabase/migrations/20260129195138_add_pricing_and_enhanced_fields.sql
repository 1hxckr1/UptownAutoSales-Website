/*
  # Add Enhanced Pricing and Vehicle Data Fields

  ## Overview
  This migration adds critical fields for proper vehicle display including pricing tiers,
  feature detection, media support, and engine specifications.

  ## 1. New Columns

  ### Pricing Fields
    - `asking_price` (numeric, NOT NULL with default)
      The actual display price for the vehicle. Defaults to existing `price` value.
      This separates display pricing from the base price field for backward compatibility.

    - `compare_price` (numeric, nullable)
      Optional market comparison price shown as strike-through pricing.
      Used to display "Was $XX,XXX, Now $YY,YYY" style pricing.

  ### Enhanced Data Fields
    - `ai_detected_features` (jsonb, nullable)
      JSON array of AI-detected or verified vehicle features.
      Example: ["Leather Seats", "Sunroof", "Navigation", "Backup Camera"]

    - `media` (jsonb, nullable)
      JSON array of media objects including videos with thumbnails.
      Example: [{"type": "video", "url": "...", "thumbnail": "..."}]

    - `engine_type` (text, nullable)
      Engine specification string (e.g., "2.0L Turbo I4", "3.5L V6")

  ## 2. Data Migration
    - Backfills `asking_price` from existing `price` column for all vehicles
    - Preserves existing `price` field for backward compatibility

  ## 3. Important Notes
    - The `price` column is NOT removed or renamed for backward compatibility
    - All read endpoints will return BOTH `price` and `asking_price`
    - Display logic uses: `asking_price ?? price` as effective price
    - New columns are added safely with IF NOT EXISTS checks
*/

DO $$
BEGIN
  -- Add asking_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'asking_price'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN asking_price numeric(10,2) DEFAULT 0;

    -- Backfill asking_price from price for all existing vehicles
    UPDATE vehicles SET asking_price = price WHERE asking_price = 0;

    -- Make it NOT NULL after backfill
    ALTER TABLE vehicles ALTER COLUMN asking_price SET NOT NULL;
  END IF;

  -- Add compare_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'compare_price'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN compare_price numeric(10,2) DEFAULT NULL;
  END IF;

  -- Add ai_detected_features column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'ai_detected_features'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN ai_detected_features jsonb DEFAULT NULL;
  END IF;

  -- Add media column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'media'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN media jsonb DEFAULT NULL;
  END IF;

  -- Add engine_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'engine_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN engine_type text DEFAULT NULL;
  END IF;
END $$;
