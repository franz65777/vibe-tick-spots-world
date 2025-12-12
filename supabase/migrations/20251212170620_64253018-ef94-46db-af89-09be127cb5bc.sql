-- Create table to track folder shares (who a private folder has been shared with)
CREATE TABLE IF NOT EXISTS public.folder_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id uuid NOT NULL REFERENCES public.saved_folders(id) ON DELETE CASCADE,
    shared_by_user_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(folder_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.folder_shares ENABLE ROW LEVEL SECURITY;

-- Policies for folder_shares
CREATE POLICY "Users can share their own folders"
ON public.folder_shares
FOR INSERT
WITH CHECK (
    shared_by_user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.saved_folders
        WHERE id = folder_shares.folder_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can view shares they're involved in"
ON public.folder_shares
FOR SELECT
USING (
    shared_by_user_id = auth.uid() OR shared_with_user_id = auth.uid()
);

CREATE POLICY "Users can delete shares they created"
ON public.folder_shares
FOR DELETE
USING (shared_by_user_id = auth.uid());

-- Drop the old RLS policy for viewing folders and create a new one that includes shared folders
DROP POLICY IF EXISTS "Anyone can view public folders" ON public.saved_folders;

CREATE POLICY "Users can view accessible folders"
ON public.saved_folders
FOR SELECT
USING (
    -- Public folders are visible to everyone
    is_private = false
    OR
    -- Owner can always see their folders
    auth.uid() = user_id
    OR
    -- Users who have been shared the folder can see it
    EXISTS (
        SELECT 1 FROM public.folder_shares
        WHERE folder_shares.folder_id = saved_folders.id
        AND folder_shares.shared_with_user_id = auth.uid()
    )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_with ON public.folder_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_folder_id ON public.folder_shares(folder_id);