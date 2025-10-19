-- Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trip_locations junction table
CREATE TABLE IF NOT EXISTS public.trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  google_place_id TEXT,
  order_index INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT trip_location_reference CHECK (
    (location_id IS NOT NULL AND google_place_id IS NULL) OR
    (location_id IS NULL AND google_place_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;

-- Trips policies
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public trips"
  ON public.trips FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- Trip locations policies
CREATE POLICY "Users can view trip locations of accessible trips"
  ON public.trip_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_locations.trip_id
      AND (trips.user_id = auth.uid() OR trips.is_public = true)
    )
  );

CREATE POLICY "Users can manage their trip locations"
  ON public.trip_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_locations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_city ON public.trips(city);
CREATE INDEX idx_trip_locations_trip_id ON public.trip_locations(trip_id);
CREATE INDEX idx_trip_locations_location_id ON public.trip_locations(location_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_updated_at();