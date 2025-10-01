-- Create user_recommendations table for personalized recommendations
CREATE TABLE IF NOT EXISTS public.user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  friends_saved INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Enable RLS
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recommendations"
  ON public.user_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage recommendations"
  ON public.user_recommendations
  FOR ALL
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_score 
  ON public.user_recommendations(user_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_location 
  ON public.user_recommendations(location_id);
