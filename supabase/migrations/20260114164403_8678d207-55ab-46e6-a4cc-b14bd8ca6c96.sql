-- Add photos column and fetch timestamp to locations table
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photos_fetched_at timestamp with time zone;

-- Create storage bucket for location photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('location-photos', 'location-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to location photos
CREATE POLICY "Location photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'location-photos');

-- Allow authenticated users to upload location photos (for the edge function via service role)
CREATE POLICY "Service role can upload location photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'location-photos');

-- Allow service role to update location photos
CREATE POLICY "Service role can update location photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'location-photos');

-- Allow service role to delete location photos
CREATE POLICY "Service role can delete location photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'location-photos');