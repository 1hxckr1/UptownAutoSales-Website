/*
  # Fix Color Extraction to Only Capture Color Names

  ## Overview
  Fixes the previous migration to extract only the actual color name,
  not the surrounding text.

  ## Changes
    1. Updates vehicles to clean up extracted colors
    2. Removes prefixes like "finished in a sleek"
    3. Extracts only the color portion properly
*/

-- Fix colors that were extracted with extra text
UPDATE vehicles
SET exterior_color = CASE
  -- Extract just the color from patterns like "finished in a sleek Modern Steel Metallic"
  WHEN exterior_color ~* 'finished in (a |an )?(sleek |stunning |beautiful )?([\w\s]+)\s+(Metallic|Pearl|Solid)' THEN
    (regexp_match(exterior_color, 'finished in (a |an )?(sleek |stunning |beautiful )?([\w\s]+)\s+(Metallic|Pearl|Solid)', 'i'))[3] || ' ' || (regexp_match(exterior_color, 'finished in (a |an )?(sleek |stunning |beautiful )?([\w\s]+)\s+(Metallic|Pearl|Solid)', 'i'))[4]
  
  ELSE exterior_color
END
WHERE exterior_color ~* 'finished in';

-- Now properly extract colors for any remaining empty fields
UPDATE vehicles
SET exterior_color = CASE
  -- Match patterns like "Modern Steel Metallic exterior"
  WHEN description ~* '\m([\w]+\s+[\w]+)\s+(Metallic|Pearl|Solid)\s+exterior\M' THEN
    trim((regexp_match(description, '\m([\w]+\s+[\w]+)\s+(Metallic|Pearl|Solid)\s+exterior\M', 'i'))[1] || ' ' || (regexp_match(description, '\m([\w]+\s+[\w]+)\s+(Metallic|Pearl|Solid)\s+exterior\M', 'i'))[2])
  
  -- Match patterns like "finished in Modern Steel Metallic"
  WHEN description ~* 'finished in (a |an )?(sleek |stunning |beautiful )?\m([\w]+\s+[\w]+)\s+(Metallic|Pearl|Solid)\M' THEN
    trim((regexp_match(description, 'finished in (a |an )?(sleek |stunning |beautiful )?\m([\w]+\s+[\w]+)\s+(Metallic|Pearl|Solid)\M', 'i'))[3] || ' ' || (regexp_match(description, 'finished in (a |an )?(sleek |stunning |beautiful )?\m([\w]+\s+[\w]+)\s+(Metallic|Pearl|Solid)\M', 'i'))[4])
  
  -- Match simple single-word colors
  WHEN description ~* 'in (a |an )?(sleek |stunning |beautiful )?\m(White|Black|Silver|Gray|Grey|Blue|Red|Green|Yellow|Orange|Brown|Tan|Beige|Gold|Bronze|Burgundy|Maroon|Navy|Purple|Charcoal|Graphite|Platinum)\M' THEN
    (regexp_match(description, 'in (a |an )?(sleek |stunning |beautiful )?\m(White|Black|Silver|Gray|Grey|Blue|Red|Green|Yellow|Orange|Brown|Tan|Beige|Gold|Bronze|Burgundy|Maroon|Navy|Purple|Charcoal|Graphite|Platinum)\M', 'i'))[3]
  
  ELSE exterior_color
END
WHERE (exterior_color IS NULL OR exterior_color = '' OR exterior_color ~* 'finished in')
AND description IS NOT NULL 
AND description != '';
