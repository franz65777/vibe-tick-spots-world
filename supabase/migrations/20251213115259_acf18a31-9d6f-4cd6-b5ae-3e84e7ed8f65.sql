-- Drop existing SELECT policy for folder_locations
DROP POLICY IF EXISTS "Users can view their folder locations" ON public.folder_locations;

-- Create new policy that allows viewing folder_locations for:
-- 1. Own folders
-- 2. Public folders (is_private = false)
CREATE POLICY "Users can view folder locations" 
ON public.folder_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM saved_folders sf
    WHERE sf.id = folder_locations.folder_id
    AND (sf.user_id = auth.uid() OR sf.is_private = false)
  )
);