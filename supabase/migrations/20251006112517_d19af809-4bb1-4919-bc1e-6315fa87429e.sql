-- 1) Update city engagement to count total saves (not distinct places)
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text, p_user uuid)
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
    SELECT user_id, created_at
    FROM public.saved_places
    WHERE city ILIKE ('%' || normalized_city || '%')
  ),
  il AS (
    SELECT usl.user_id, usl.created_at
    FROM public.user_saved_locations usl
    JOIN public.locations l ON l.id = usl.location_id
    WHERE l.city ILIKE ('%' || normalized_city || '%')
  ),
  all_saves AS (
    SELECT user_id, created_at FROM sp
    UNION ALL
    SELECT user_id, created_at FROM il
  ),
  my_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = p_user
  ),
  saver_latest AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.username,
      p.avatar_url,
      s.created_at
    FROM all_saves s
    JOIN my_follows f ON f.following_id = s.user_id
    JOIN public.profiles p ON p.id = s.user_id
    ORDER BY p.id, s.created_at DESC
  )
  SELECT
    (SELECT COUNT(*) FROM all_saves)::bigint AS total_pins,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('id', id, 'username', username, 'avatar_url', avatar_url)
        ORDER BY created_at DESC
      ) FILTER (WHERE id IS NOT NULL),
      '[]'::jsonb
    ) AS followed_users
  FROM saver_latest;
END;
$$;

-- Wrapper function using auth.uid()
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text)
RETURNS TABLE(total_pins integer, followed_users jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (gc.total_pins)::integer, gc.followed_users
  FROM public.get_city_engagement(p_city, auth.uid()) AS gc;
$$;

-- 2) Add target_user_id to search_history for accurate recent user searches
ALTER TABLE public.search_history
ADD COLUMN IF NOT EXISTS target_user_id uuid;

-- Helpful index for recent user lookups
CREATE INDEX IF NOT EXISTS idx_search_history_target_user
ON public.search_history (target_user_id) WHERE search_type = 'users';