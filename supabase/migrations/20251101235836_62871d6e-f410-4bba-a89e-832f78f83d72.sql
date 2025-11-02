-- Create hidden_messages table for soft delete functionality
CREATE TABLE IF NOT EXISTS public.hidden_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

-- Enable RLS
ALTER TABLE public.hidden_messages ENABLE ROW LEVEL SECURITY;

-- Users can hide messages for themselves
CREATE POLICY "Users can hide messages for themselves"
ON public.hidden_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their hidden messages
CREATE POLICY "Users can view their hidden messages"
ON public.hidden_messages FOR SELECT
USING (auth.uid() = user_id);

-- Users can unhide messages
CREATE POLICY "Users can unhide messages"
ON public.hidden_messages FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_hidden_messages_user_message ON public.hidden_messages(user_id, message_id);