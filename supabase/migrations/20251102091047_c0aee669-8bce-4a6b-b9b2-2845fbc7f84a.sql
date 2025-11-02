-- Add story_id column to direct_messages for story replies
ALTER TABLE public.direct_messages 
ADD COLUMN story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL;