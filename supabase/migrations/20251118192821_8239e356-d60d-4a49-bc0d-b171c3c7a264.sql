-- Create saved_folders table for custom organization
CREATE TABLE IF NOT EXISTS public.saved_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create folder_locations junction table
CREATE TABLE IF NOT EXISTS public.folder_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES saved_folders(id) ON DELETE CASCADE,
  location_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(folder_id, location_id)
);

-- Enable RLS
ALTER TABLE public.saved_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_locations ENABLE ROW LEVEL SECURITY;

-- Policies for saved_folders
CREATE POLICY "Users can view their own folders"
  ON public.saved_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON public.saved_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.saved_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.saved_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for folder_locations
CREATE POLICY "Users can view their folder locations"
  ON public.folder_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_folders
      WHERE id = folder_locations.folder_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add locations to their folders"
  ON public.folder_locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_folders
      WHERE id = folder_locations.folder_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove locations from their folders"
  ON public.folder_locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_folders
      WHERE id = folder_locations.folder_id
      AND user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_saved_folders_updated_at
  BEFORE UPDATE ON public.saved_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_saved_folders_user_id ON public.saved_folders(user_id);
CREATE INDEX idx_folder_locations_folder_id ON public.folder_locations(folder_id);
CREATE INDEX idx_folder_locations_location_id ON public.folder_locations(location_id);