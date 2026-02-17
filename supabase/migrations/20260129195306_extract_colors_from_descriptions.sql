/*
  # Extract Exterior Colors from Vehicle Descriptions

  ## Overview
  This migration extracts exterior colors from vehicle descriptions when the 
  exterior_color field is empty. It uses pattern matching to find color mentions
  in the description text.

  ## Changes
    1. Updates vehicles with empty exterior_color by parsing their descriptions
    2. Looks for common color patterns like "[Color] exterior", "[Color] Metallic", etc.
    3. Extracts the first color mention found in the description

  ## Notes
    - Only updates vehicles where exterior_color is NULL or empty
    - Only processes vehicles that have a non-empty description
    - Uses case-insensitive pattern matching
    - Preserves original description text unchanged
*/

-- Update vehicles with colors extracted from descriptions
UPDATE vehicles
SET exterior_color = CASE
  -- Match patterns like "Modern Steel Metallic exterior" or "finished in a sleek Modern Steel Metallic"
  WHEN description ~* '\m([\w\s]+)\s+(Metallic|Pearl|Solid)\s+exterior\M' THEN
    (regexp_match(description, '\m([\w\s]+)\s+(Metallic|Pearl|Solid)\s+exterior\M', 'i'))[1] || ' ' || (regexp_match(description, '\m([\w\s]+)\s+(Metallic|Pearl|Solid)\s+exterior\M', 'i'))[2]
  
  -- Match patterns like "finished in Modern Steel Metallic"
  WHEN description ~* 'finished in (a |an )?(sleek |stunning |beautiful )?\m([\w\s]+)\s+(Metallic|Pearl|Solid)\M' THEN
    (regexp_match(description, 'finished in (a |an )?(sleek |stunning |beautiful )?\m([\w\s]+)\s+(Metallic|Pearl|Solid)\M', 'i'))[3] || ' ' || (regexp_match(description, 'finished in (a |an )?(sleek |stunning |beautiful )?\m([\w\s]+)\s+(Metallic|Pearl|Solid)\M', 'i'))[4]
  
  -- Match simple color names followed by "exterior"
  WHEN description ~* '\m(White|Black|Silver|Gray|Grey|Blue|Red|Green|Yellow|Orange|Brown|Tan|Beige|Gold|Bronze|Burgundy|Maroon|Navy|Purple|Charcoal|Graphite|Platinum|Pearl|Titanium)\s+exterior\M' THEN
    (regexp_match(description, '\m(White|Black|Silver|Gray|Grey|Blue|Red|Green|Yellow|Orange|Brown|Tan|Beige|Gold|Bronze|Burgundy|Maroon|Navy|Purple|Charcoal|Graphite|Platinum|Pearl|Titanium)\s+exterior\M', 'i'))[1]
  
  -- Match "in [color]" patterns
  WHEN description ~* 'in (a |an )?(sleek |stunning |beautiful )?\m(White|Black|Silver|Gray|Grey|Blue|Red|Green|Yellow|Orange|Brown|Tan|Beige|Gold|Bronze|Burgundy|Maroon|Navy|Purple|Charcoal|Graphite|Platinum|Pearl|Titanium)\M' THEN
    (regexp_match(description, 'in (a |an )?(sleek |stunning |beautiful )?\m(White|Black|Silver|Gray|Grey|Blue|Red|Green|Yellow|Orange|Brown|Tan|Beige|Gold|Bronze|Burgundy|Maroon|Navy|Purple|Charcoal|Graphite|Platinum|Pearl|Titanium)\M', 'i'))[3]
  
  ELSE exterior_color
END
WHERE (exterior_color IS NULL OR exterior_color = '')
AND description IS NOT NULL 
AND description != '';
