-- Add is_private and description columns to saved_folders table
ALTER TABLE public.saved_folders 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update RLS policies to allow viewing public folders
CREATE POLICY "Anyone can view public folders"
  ON public.saved_folders FOR SELECT
  USING (is_private = false OR auth.uid() = user_id);

-- Drop old select policy
DROP POLICY IF EXISTS "Users can view their own folders" ON public.saved_folders;