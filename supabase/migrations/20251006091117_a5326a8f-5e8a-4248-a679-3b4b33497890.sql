-- Drop the old get_user_feed function and create an improved version
DROP FUNCTION IF EXISTS public.get_user_feed(uuid, integer);

-- Create enhanced feed function that includes saved places, posts, and comments
CREATE OR REPLACE FUNCTION public.get_user_feed(target_user_id uuid, feed_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  event_type text,
  user_id uuid,
  username text,
  avatar_url text,
  location_id uuid,
  location_name text,
  post_id uuid,
  content text,
  media_url text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH following_users AS (
    SELECT following_id FROM public.follows WHERE follower_id = target_user_id
  ),
  feed_items AS (
    -- Saved places from followed users
    SELECT 
      sp.id,
      'saved_place'::text as event_type,
      sp.user_id,
      p.username,
      p.avatar_url,
      NULL::uuid as location_id,
      sp.place_name as location_name,
      NULL::uuid as post_id,
      NULL::text as content,
      NULL::text as media_url,
      sp.created_at
    FROM public.saved_places sp
    JOIN public.profiles p ON sp.user_id = p.id
    WHERE sp.user_id IN (SELECT following_id FROM following_users)
      AND sp.created_at >= NOW() - INTERVAL '7 days'
    
    UNION ALL
    
    -- Posts from followed users
    SELECT 
      po.id,
      'new_post'::text as event_type,
      po.user_id,
      p.username,
      p.avatar_url,
      po.location_id,
      l.name as location_name,
      po.id as post_id,
      po.caption as content,
      (po.media_urls->>0) as media_url,
      po.created_at
    FROM public.posts po
    JOIN public.profiles p ON po.user_id = p.id
    LEFT JOIN public.locations l ON po.location_id = l.id
    WHERE po.user_id IN (SELECT following_id FROM following_users)
      AND po.created_at >= NOW() - INTERVAL '7 days'
    
    UNION ALL
    
    -- Comments from followed users on posts
    SELECT 
      pc.id,
      'new_comment'::text as event_type,
      pc.user_id,
      p.username,
      p.avatar_url,
      po.location_id,
      l.name as location_name,
      pc.post_id,
      pc.content,
      (po.media_urls->>0) as media_url,
      pc.created_at
    FROM public.post_comments pc
    JOIN public.profiles p ON pc.user_id = p.id
    JOIN public.posts po ON pc.post_id = po.id
    LEFT JOIN public.locations l ON po.location_id = l.id
    WHERE pc.user_id IN (SELECT following_id FROM following_users)
      AND pc.created_at >= NOW() - INTERVAL '7 days'
    
    UNION ALL
    
    -- Interactions from followed users (likes, saves)
    SELECT 
      i.id,
      CONCAT(i.action_type, '_location')::text as event_type,
      i.user_id,
      p.username,
      p.avatar_url,
      i.location_id,
      l.name as location_name,
      NULL::uuid as post_id,
      NULL::text as content,
      l.image_url as media_url,
      i.created_at
    FROM public.interactions i
    JOIN public.profiles p ON i.user_id = p.id
    LEFT JOIN public.locations l ON i.location_id = l.id
    WHERE i.user_id IN (SELECT following_id FROM following_users)
      AND i.created_at >= NOW() - INTERVAL '7 days'
  )
  SELECT * FROM feed_items
  ORDER BY created_at DESC
  LIMIT feed_limit;
END;
$$;