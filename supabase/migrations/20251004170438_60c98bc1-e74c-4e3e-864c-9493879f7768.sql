-- Create location_swipes table to track user swipes
CREATE TABLE IF NOT EXISTS public.location_swipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  swiped_right BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_swipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own swipes"
  ON public.location_swipes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own swipes"
  ON public.location_swipes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_location_swipes_user_date 
  ON public.location_swipes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_swipes_location
  ON public.location_swipes(location_id);