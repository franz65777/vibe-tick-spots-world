-- Create post_reviews table for user reviews with ratings
CREATE TABLE IF NOT EXISTS public.post_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id) -- One review per user per post
);

-- Enable RLS
ALTER TABLE public.post_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all reviews"
  ON public.post_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON public.post_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.post_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.post_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_post_reviews_post_id ON public.post_reviews(post_id);
CREATE INDEX idx_post_reviews_user_id ON public.post_reviews(user_id);
CREATE INDEX idx_post_reviews_location_id ON public.post_reviews(location_id);

-- Trigger for updated_at
CREATE TRIGGER update_post_reviews_updated_at
  BEFORE UPDATE ON public.post_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reviews;