/*
  # Add URL slugs to vehicles table

  1. New Columns
    - `slug` (text, unique) - Human-readable URL slug like "2020-acura-rdx"

  2. Changes
    - Populates slug for all existing vehicles from year, make, model
    - Handles duplicates by appending numeric suffix (e.g., "2020-acura-rdx-2")
    - Creates unique index on slug for fast lookups
    - Creates trigger to auto-generate slug on insert/update

  3. Important Notes
    - Slug format: {year}-{make}-{model} lowercased, spaces/special chars replaced with hyphens
    - Duplicate slugs get numeric suffixes automatically
    - Trigger fires on INSERT or UPDATE of year/make/model columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'slug'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN slug text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_vehicle_slug()
RETURNS trigger AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        trim(coalesce(NEW.year::text, '') || '-' || coalesce(NEW.make, '') || '-' || coalesce(NEW.model, '')),
        '[^a-zA-Z0-9\-]', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);

  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'vehicle';
  END IF;

  final_slug := base_slug;

  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM vehicles
      WHERE slug = final_slug AND id != NEW.id
    ) THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_vehicle_slug ON vehicles;

CREATE TRIGGER trg_generate_vehicle_slug
  BEFORE INSERT OR UPDATE OF year, make, model ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION generate_vehicle_slug();

UPDATE vehicles SET slug = NULL WHERE slug IS NULL OR slug = '';

UPDATE vehicles
SET year = year
WHERE slug IS NULL OR slug = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_slug_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_vehicles_slug_unique ON vehicles(slug) WHERE slug IS NOT NULL;
  END IF;
END $$;
