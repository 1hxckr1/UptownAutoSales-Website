-- SQL to insert Uptown Auto Sales into dealer_info table
-- Run this in the Supabase SQL Editor for this dealer's website project

INSERT INTO dealer_info (
  name,
  phone,
  email,
  address,
  city,
  state,
  zip_code,
  website_url,
  logo_url,
  primary_color,
  secondary_color,
  business_hours,
  meta_description,
  google_analytics_id,
  facebook_pixel_id
) VALUES (
  'Uptown Auto Sales',
  '706-295-9700',
  'sales@uptownautosales.com',
  'Rome, GA 30161',
  'Rome',
  'GA',
  '30161',
  'https://uptownautosales.com',
  null, -- Add logo URL when available
  '#dc2626', -- Red primary color
  '#1e40af', -- Blue secondary color
  'Mon-Sat: 9AM-7PM, Sun: Closed',
  'Uptown Auto Sales offers quality used cars in Rome, GA. Bad credit OK. Buy Here Pay Here financing available. Call 706-295-9700 today!',
  null, -- Add GA tracking ID when available
  null  -- Add FB pixel ID when available
);

-- Note: If the dealer already exists, you may need to UPDATE instead:
-- UPDATE dealer_info SET 
--   phone = '706-295-9700',
--   primary_color = '#dc2626',
--   ... 
-- WHERE name = 'Uptown Auto Sales';
