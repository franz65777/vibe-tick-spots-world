-- Create a secure function to fetch locations saved by people the current user follows
CREATE OR REPLACE FUNCTION public.get_following_saved_locations()
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  created_by uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.name, l.category, l.address, l.city, l.latitude, l.longitude, l.created_by, usl.created_at
  FROM public.follows f
  JOIN public.user_saved_locations usl ON usl.user_id = f.following_id
  JOIN public.locations l ON l.id = usl.location_id
  WHERE f.follower_id = auth.uid();
$$;