-- Create interactions table for tracking user actions
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('like', 'save', 'visit', 'share', 'view')),
  weight NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_interactions_user_id ON public.interactions(user_id);
CREATE INDEX idx_interactions_location_id ON public.interactions(location_id);
CREATE INDEX idx_interactions_created_at ON public.interactions(created_at DESC);
CREATE INDEX idx_interactions_user_location ON public.interactions(user_id, location_id);

-- Enable RLS
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own interactions"
  ON public.interactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interactions"
  ON public.interactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends' interactions for recommendations"
  ON public.interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = auth.uid()
      AND following_id = interactions.user_id
    )
  );

-- Create a materialized view for cached trending calculations
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_locations AS
SELECT 
  location_id,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_interactions,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as previous_interactions,
  CASE 
    WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') > 0
    THEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::float / 
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::float
    ELSE 1.0
  END as trend_ratio,
  MAX(created_at) as last_updated
FROM public.interactions
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY location_id;

-- Create index on materialized view
CREATE INDEX idx_trending_locations_id ON public.trending_locations(location_id);
CREATE INDEX idx_trending_locations_ratio ON public.trending_locations(trend_ratio DESC);

-- Function to refresh trending locations (call this periodically)
CREATE OR REPLACE FUNCTION refresh_trending_locations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_locations;
END;
$$;

-- Create a function to get user interaction weights by category
CREATE OR REPLACE FUNCTION get_user_category_weights(target_user_id UUID)
RETURNS TABLE(category TEXT, weight NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.category,
    SUM(i.weight) as total_weight
  FROM public.interactions i
  JOIN public.locations l ON i.location_id = l.id
  WHERE i.user_id = target_user_id
    AND i.created_at >= NOW() - INTERVAL '90 days'
  GROUP BY l.category
  ORDER BY total_weight DESC;
END;
$$;