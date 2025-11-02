-- Create story_likes table
CREATE TABLE IF NOT EXISTS public.story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_views table for tracking who viewed stories
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_likes
CREATE POLICY "Users can view all story likes"
  ON public.story_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like stories"
  ON public.story_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike stories"
  ON public.story_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for story_views
CREATE POLICY "Users can view story views"
  ON public.story_views FOR SELECT
  USING (true);

CREATE POLICY "Users can mark stories as viewed"
  ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_story_likes_story_id ON public.story_likes(story_id);
CREATE INDEX idx_story_likes_user_id ON public.story_likes(user_id);
CREATE INDEX idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX idx_story_views_user_id ON public.story_views(user_id);

-- Enable realtime for story likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;