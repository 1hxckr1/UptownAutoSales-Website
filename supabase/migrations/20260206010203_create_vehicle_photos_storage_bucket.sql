/*
  # Create vehicle-photos storage bucket

  1. Storage
    - Creates a public `vehicle-photos` bucket for locally-cached vehicle images
    - Images are organized by VIN: `vehicles/{vin}/{index}.jpg`

  2. Security
    - Public read access (images are served to anonymous website visitors)
    - Only service_role can write (sync function uses service role key)

  3. Notes
    - The inventory sync edge function downloads photos from the Fender API
      and re-uploads them here for reliability and performance
    - When a vehicle is marked as sold/disabled, its photos are cleaned up
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
