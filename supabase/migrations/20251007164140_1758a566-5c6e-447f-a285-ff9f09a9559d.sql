-- Create post_shares table for tracking shared posts
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, shared_at)
);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Users can insert their own shares
CREATE POLICY "Users can share posts"
  ON public.post_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view all shares
CREATE POLICY "Users can view all shares"
  ON public.post_shares
  FOR SELECT
  USING (true);

-- Create index for better performance
CREATE INDEX idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX idx_post_shares_user_id ON public.post_shares(user_id);

-- Create hidden_posts table for users to hide posts
CREATE TABLE IF NOT EXISTS public.hidden_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

-- Users can hide posts
CREATE POLICY "Users can hide posts"
  ON public.hidden_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own hidden posts
CREATE POLICY "Users can view their hidden posts"
  ON public.hidden_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can unhide posts
CREATE POLICY "Users can unhide posts"
  ON public.hidden_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_hidden_posts_user_id ON public.hidden_posts(user_id);
CREATE INDEX idx_hidden_posts_post_id ON public.hidden_posts(post_id);