
-- Add RLS policies for posts table (skip bucket creation since it exists)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

CREATE POLICY "Users can view all posts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all locations" ON locations;
DROP POLICY IF EXISTS "Users can create locations" ON locations;
DROP POLICY IF EXISTS "Users can update locations they created" ON locations;

CREATE POLICY "Users can view all locations" ON locations
  FOR SELECT USING (true);

CREATE POLICY "Users can create locations" ON locations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update locations they created" ON locations
  FOR UPDATE USING (auth.uid() = created_by);

-- Add RLS policies for user_saved_locations table
ALTER TABLE user_saved_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved locations" ON user_saved_locations;
DROP POLICY IF EXISTS "Users can save locations" ON user_saved_locations;
DROP POLICY IF EXISTS "Users can unsave their locations" ON user_saved_locations;

CREATE POLICY "Users can view their own saved locations" ON user_saved_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save locations" ON user_saved_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave their locations" ON user_saved_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage policies for the existing media bucket
CREATE POLICY "Users can upload their own media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Media files are publicly viewable" ON storage.objects
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
