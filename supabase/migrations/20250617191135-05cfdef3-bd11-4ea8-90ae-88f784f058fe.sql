
-- Create user_saved_locations table to track saved locations per user
CREATE TABLE IF NOT EXISTS public.user_saved_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Enable RLS on user_saved_locations
ALTER TABLE public.user_saved_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_saved_locations
CREATE POLICY "Users can view their own saved locations" 
  ON public.user_saved_locations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved locations" 
  ON public.user_saved_locations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved locations" 
  ON public.user_saved_locations 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create storage bucket for media uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for media bucket
CREATE POLICY "Users can upload their own media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Users can update their own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add triggers to update post counts automatically
CREATE OR REPLACE FUNCTION public.update_posts_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET posts_count = posts_count + 1 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_posts_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET posts_count = GREATEST(posts_count - 1, 0)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for posts table
DROP TRIGGER IF EXISTS posts_count_insert_trigger ON public.posts;
CREATE TRIGGER posts_count_insert_trigger
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_posts_count_on_insert();

DROP TRIGGER IF EXISTS posts_count_delete_trigger ON public.posts;
CREATE TRIGGER posts_count_delete_trigger
  AFTER DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_posts_count_on_delete();

-- Add google_place_id to locations table to link with Google Maps
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS place_types TEXT[];

-- Create index for Google Place ID lookups
CREATE INDEX IF NOT EXISTS idx_locations_google_place_id ON public.locations(google_place_id);

-- Add avatar_url column to profiles if it doesn't exist (it should already exist)
-- This is just to ensure it exists for profile picture functionality
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;
