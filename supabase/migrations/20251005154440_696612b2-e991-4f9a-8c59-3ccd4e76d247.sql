-- Create secure city engagement function that aggregates saves across tables
CREATE OR REPLACE FUNCTION public.get_city_engagement(p_city text, p_user uuid)
RETURNS TABLE (
  total_pins bigint,
  followed_users jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH pins AS (
  SELECT COUNT(*)::bigint AS c
  FROM (
    SELECT sp.id
    FROM saved_places sp
    WHERE sp.city = p_city
    UNION ALL
    SELECT usl.id
    FROM user_saved_locations usl
    JOIN locations l ON l.id = usl.location_id
    WHERE l.city = p_city
  ) x
),
followed AS (
  SELECT f.following_id AS user_id
  FROM follows f
  WHERE f.follower_id = p_user
),
savers AS (
  SELECT u.user_id AS id, p.username, p.avatar_url, s.created_at
  FROM followed u
  JOIN profiles p ON p.id = u.user_id
  JOIN (
    SELECT user_id, created_at FROM saved_places WHERE city = p_city
    UNION ALL
    SELECT usl.user_id, usl.created_at FROM user_saved_locations usl
    JOIN locations l ON l.id = usl.location_id WHERE l.city = p_city
  ) s ON s.user_id = u.user_id
),
savers_ranked AS (
  SELECT DISTINCT ON (id) id, username, avatar_url, created_at
  FROM savers
  ORDER BY id, created_at DESC
),
savers_limited AS (
  SELECT id, username, avatar_url, created_at
  FROM savers_ranked
  ORDER BY created_at DESC
  LIMIT 3
),
agg AS (
  SELECT
    (SELECT c FROM pins) AS total_pins,
    COALESCE(jsonb_agg(jsonb_build_object('id', id, 'username', username, 'avatar_url', avatar_url)
      ORDER BY created_at DESC), '[]'::jsonb) AS followed_users
  FROM savers_limited
)
SELECT total_pins, followed_users FROM agg
UNION ALL
SELECT (SELECT c FROM pins), '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM savers_limited);
$$;

-- Allow authenticated users to execute the function
GRANT EXECUTE ON FUNCTION public.get_city_engagement(text, uuid) TO authenticated;