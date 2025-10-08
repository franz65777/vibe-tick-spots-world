-- Create table to track location card view durations
CREATE TABLE IF NOT EXISTS public.location_view_duration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_id UUID,
  google_place_id TEXT,
  duration_seconds INTEGER NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.location_view_duration ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own view durations
CREATE POLICY "Users can insert their own view durations"
  ON public.location_view_duration
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own view durations
CREATE POLICY "Users can view their own view durations"
  ON public.location_view_duration
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_location_view_duration_location_id ON public.location_view_duration(location_id);
CREATE INDEX idx_location_view_duration_google_place_id ON public.location_view_duration(google_place_id);
CREATE INDEX idx_location_view_duration_viewed_at ON public.location_view_duration(viewed_at);

-- Add comment
COMMENT ON TABLE public.location_view_duration IS 'Tracks how long users spend viewing location detail cards';