-- Add view and save tracking for folders
ALTER TABLE saved_folders ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE saved_folders ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
ALTER TABLE saved_folders ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add view and save tracking for trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- Create table to track folder views
CREATE TABLE IF NOT EXISTS folder_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES saved_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, user_id)
);

-- Create table to track folder saves (who saved which folder)
CREATE TABLE IF NOT EXISTS folder_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES saved_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, user_id)
);

-- Enable RLS
ALTER TABLE folder_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_saves ENABLE ROW LEVEL SECURITY;

-- RLS policies for folder_views
CREATE POLICY "Users can insert their own folder views"
  ON folder_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view folder views"
  ON folder_views FOR SELECT
  USING (true);

-- RLS policies for folder_saves
CREATE POLICY "Users can save folders"
  ON folder_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave folders"
  ON folder_saves FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view folder saves"
  ON folder_saves FOR SELECT
  USING (true);