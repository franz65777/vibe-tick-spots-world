-- Create message reactions table for emoji reactions like Instagram/TikTok
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages they're involved in
CREATE POLICY "Users can view reactions on their messages"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE dm.id = message_reactions.message_id
    AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
  )
);

-- Users can add reactions to messages they're involved in
CREATE POLICY "Users can add reactions to their messages"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE dm.id = message_reactions.message_id
    AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
  )
);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);