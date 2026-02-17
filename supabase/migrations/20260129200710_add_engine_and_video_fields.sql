/*
  # Add engine and video_urls columns to vehicles table

  1. Changes
    - Add `engine` column (text) to store simplified engine description
    - Add `video_urls` column (jsonb) to store array of video URLs
  
  2. Notes
    - `engine` is different from `engine_type` - provides a simplified version
    - `video_urls` complements photo_urls for multimedia content
    - Both columns are nullable to support existing data
*/

-- Add engine column for simplified engine description
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'engine'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN engine text;
  END IF;
END $$;

-- Add video_urls column for video content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'video_urls'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN video_urls jsonb;
  END IF;
END $$;
