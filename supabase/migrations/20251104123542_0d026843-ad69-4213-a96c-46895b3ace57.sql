-- Create user_muted_locations table
CREATE TABLE IF NOT EXISTS public.user_muted_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Enable RLS
ALTER TABLE public.user_muted_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own muted locations"
  ON public.user_muted_locations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mute locations"
  ON public.user_muted_locations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmute locations"
  ON public.user_muted_locations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_user_muted_locations_user_id ON public.user_muted_locations(user_id);
CREATE INDEX idx_user_muted_locations_location_id ON public.user_muted_locations(location_id);