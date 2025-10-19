-- Fix search path for trips trigger function
DROP FUNCTION IF EXISTS update_trips_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trips_updated_at ON public.trips;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_updated_at();