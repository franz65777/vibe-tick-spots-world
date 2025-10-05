-- Fix get_city_engagement function to return unique pin counts and followed savers with real-time-ready data

-- Drop old versions first
DROP FUNCTION IF EXISTS public.get_city_engagement(text, uuid);
DROP FUNCTION IF EXISTS public.get_city_engagement(text);

-- Main function with user parameter for followed users
CREATE FUNCTION public.get_city_engagement(p_city text, p_user uuid)
RETURNS TABLE(total_pins bigint, followed_users jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_city text := trim(split_part(coalesce(p_city, ''), ',', 1));
BEGIN
  RETURN QUERY
  WITH sp AS (
    SELECT DISTINCT place_id::text AS uid
    FROM public.saved_places
    WHERE city ILIKE ('%' || normalized_city || '%')
  ),
  il AS (
    SELECT DISTINCT l.id::text AS uid
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city ILIKE ('%' || normalized_city || '%')
  ),
  union_ids AS (
    SELECT uid FROM sp
    UNION
    SELECT uid FROM il
  ),
  my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = p_user
  ),
  savers AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.username,
      p.avatar_url,
      s.created_at
    FROM (
      SELECT user_id, created_at FROM public.saved_places WHERE city ILIKE ('%' || normalized_city || '%')
      UNION ALL
      SELECT usl.user_id, usl.created_at
      FROM public.user_saved_locations usl
      JOIN public.locations l ON l.id = usl.location_id
      WHERE l.city ILIKE ('%' || normalized_city || '%')
    ) s
    JOIN my_follows f ON f.following_id = s.user_id
    JOIN public.profiles p ON p.id = s.user_id
    ORDER BY p.id, s.created_at DESC
  ),
  agg AS (
    SELECT
      (SELECT COUNT(*) FROM union_ids)::bigint AS total_pins,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', id, 'username', username, 'avatar_url', avatar_url)
          ORDER BY created_at DESC
        ) FILTER (WHERE id IS NOT NULL),
        '[]'::jsonb
      ) AS followed_users
    FROM savers
  )
  SELECT agg.total_pins, agg.followed_users FROM agg;
END;
$$;

-- Compatibility wrapper (1-arg) using auth.uid()
CREATE FUNCTION public.get_city_engagement(p_city text)
RETURNS TABLE(total_pins integer, followed_users jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (gc.total_pins)::integer, gc.followed_users
  FROM public.get_city_engagement(p_city, auth.uid()) AS gc;
$$;

GRANT EXECUTE ON FUNCTION public.get_city_engagement(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_engagement(text) TO authenticated;