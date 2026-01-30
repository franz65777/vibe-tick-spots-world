-- Add missing RLS policies for folder_locations table
-- Using DROP IF EXISTS then CREATE to avoid conflicts

-- Policy for SELECT: folder owner can view their folder's locations
DROP POLICY IF EXISTS "Users can view locations in their folders" ON public.folder_locations;
CREATE POLICY "Users can view locations in their folders"
ON public.folder_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.saved_folders
    WHERE saved_folders.id = folder_locations.folder_id
    AND saved_folders.user_id = auth.uid()
  )
);

-- Policy for DELETE: folder owner can remove locations from their folders
DROP POLICY IF EXISTS "Users can remove locations from their folders" ON public.folder_locations;
CREATE POLICY "Users can remove locations from their folders"
ON public.folder_locations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.saved_folders
    WHERE saved_folders.id = folder_locations.folder_id
    AND saved_folders.user_id = auth.uid()
  )
);

-- Policy for UPDATE: folder owner can update locations in their folders (for upsert)
DROP POLICY IF EXISTS "Users can update locations in their folders" ON public.folder_locations;
CREATE POLICY "Users can update locations in their folders"
ON public.folder_locations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.saved_folders
    WHERE saved_folders.id = folder_locations.folder_id
    AND saved_folders.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.saved_folders
    WHERE saved_folders.id = folder_locations.folder_id
    AND saved_folders.user_id = auth.uid()
  )
);

-- Add unique constraint for upsert to work correctly (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'folder_locations_folder_id_location_id_key'
  ) THEN
    ALTER TABLE public.folder_locations
    ADD CONSTRAINT folder_locations_folder_id_location_id_key 
    UNIQUE (folder_id, location_id);
  END IF;
END $$;