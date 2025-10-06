-- Function to fetch saves from followed users (with profile info)
CREATE OR REPLACE FUNCTION public.get_following_saved_places(limit_count integer DEFAULT 100)
RETURNS TABLE(
  place_id text,
  place_name text,
  place_category text,
  city text,
  coordinates jsonb,
  user_id uuid,
  username text,
  avatar_url text,
  created_at timestamptz
) AS $$
  WITH following AS (
    SELECT following_id FROM public.follows WHERE follower_id = auth.uid()
  )
  SELECT 
    sp.place_id,
    sp.place_name,
    sp.place_category,
    sp.city,
    sp.coordinates,
    sp.user_id,
    p.username,
    p.avatar_url,
    sp.created_at
  FROM public.saved_places sp
  JOIN following f ON f.following_id = sp.user_id
  JOIN public.profiles p ON p.id = sp.user_id
  ORDER BY sp.created_at DESC
  LIMIT limit_count;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Trigger to ensure a locations row exists when a place is saved
CREATE OR REPLACE FUNCTION public.ensure_location_for_saved_place()
RETURNS trigger AS $$
BEGIN
  IF NEW.place_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only create if not already present by google_place_id
  IF NOT EXISTS (
    SELECT 1 FROM public.locations WHERE google_place_id = NEW.place_id
  ) THEN
    INSERT INTO public.locations (
      google_place_id,
      name,
      category,
      city,
      address,
      latitude,
      longitude,
      created_by
    ) VALUES (
      NEW.place_id,
      COALESCE(NEW.place_name, 'Unknown'),
      COALESCE(NEW.place_category, 'place'),
      NEW.city,
      NULL,
      NULLIF((NEW.coordinates->>'lat'), '')::numeric,
      NULLIF((NEW.coordinates->>'lng'), '')::numeric,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ensure_location_for_saved_place ON public.saved_places;
CREATE TRIGGER ensure_location_for_saved_place
AFTER INSERT ON public.saved_places
FOR EACH ROW EXECUTE FUNCTION public.ensure_location_for_saved_place();