-- Fix functions using JSON operators on text[] media_urls
-- Replace ->> 0 with array indexing [1]

-- 1) Fix notify_post_liked to use first element of text[] correctly
CREATE OR REPLACE FUNCTION public.notify_post_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner uuid;
  liker_name text;
  liker_avatar text;
  post_caption text;
  post_image text;
BEGIN
  -- Get post owner and a preview
  SELECT p.user_id, p.caption, (p.media_urls)[1] -- first image url in text[]
  INTO post_owner, post_caption, post_image
  FROM public.posts p
  WHERE p.id = NEW.post_id;

  -- Do not notify if owner likes their own post
  IF post_owner IS NULL OR post_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Liker profile
  SELECT username, avatar_url
  INTO liker_name, liker_avatar
  FROM public.profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    post_owner,
    'like',
    'New like on your post',
    COALESCE(liker_name, 'Someone') || ' liked your post',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'user_name', liker_name,
      'user_avatar', liker_avatar,
      'post_id', NEW.post_id,
      'post_image', post_image,
      'caption', post_caption
    )
  );

  RETURN NEW;
END; $$;

-- Ensure trigger is attached (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'notify_post_liked_trigger' 
      AND tgrelid = 'public.post_likes'::regclass
  ) THEN
    CREATE TRIGGER notify_post_liked_trigger
    AFTER INSERT ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_post_liked();
  END IF;
END $$;

-- 2) Fix get_user_feed to use first element of text[] correctly
CREATE OR REPLACE FUNCTION public.get_user_feed(target_user_id uuid, feed_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, event_type text, user_id uuid, username text, avatar_url text, location_id uuid, location_name text, post_id uuid, content text, media_url text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH following_users AS (
    SELECT following_id FROM public.follows WHERE follower_id = target_user_id
  ),
  feed_items AS (
    -- Saved Google places from followed users
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
      AND sp.created_at >= NOW() - INTERVAL '30 days'

    UNION ALL

    -- Saved internal locations from followed users
    SELECT 
      usl.id,
      'saved_location'::text as event_type,
      usl.user_id,
      p.username,
      p.avatar_url,
      usl.location_id,
      l.name as location_name,
      NULL::uuid as post_id,
      NULL::text as content,
      l.image_url as media_url,
      usl.created_at
    FROM public.user_saved_locations usl
    JOIN public.profiles p ON usl.user_id = p.id
    JOIN public.locations l ON l.id = usl.location_id
    WHERE usl.user_id IN (SELECT following_id FROM following_users)
      AND usl.created_at >= NOW() - INTERVAL '30 days'

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
      (po.media_urls)[1] as media_url,
      po.created_at
    FROM public.posts po
    JOIN public.profiles p ON po.user_id = p.id
    LEFT JOIN public.locations l ON po.location_id = l.id
    WHERE po.user_id IN (SELECT following_id FROM following_users)
      AND po.created_at >= NOW() - INTERVAL '30 days'

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
      (po.media_urls)[1] as media_url,
      pc.created_at
    FROM public.post_comments pc
    JOIN public.profiles p ON pc.user_id = p.id
    JOIN public.posts po ON pc.post_id = po.id
    LEFT JOIN public.locations l ON po.location_id = l.id
    WHERE pc.user_id IN (SELECT following_id FROM following_users)
      AND pc.created_at >= NOW() - INTERVAL '30 days'

    UNION ALL

    -- Interactions from followed users (likes, visits, shares)
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
      AND i.created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT * FROM feed_items
  ORDER BY created_at DESC
  LIMIT feed_limit;
END; $$;