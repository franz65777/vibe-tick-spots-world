-- Create user_blocks table for blocking functionality
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view blocks where they are the blocker
CREATE POLICY "Users can view their own blocks" 
ON public.user_blocks 
FOR SELECT 
USING (auth.uid() = blocker_id);

-- Users can create their own blocks
CREATE POLICY "Users can create blocks" 
ON public.user_blocks 
FOR INSERT 
WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks" 
ON public.user_blocks 
FOR DELETE 
USING (auth.uid() = blocker_id);

-- Add index for better performance
CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_user_id);