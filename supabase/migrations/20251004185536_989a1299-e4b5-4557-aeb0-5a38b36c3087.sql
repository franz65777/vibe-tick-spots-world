-- Create notifications on follow and post like
-- Ensure realtime works for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications';
  IF NOT FOUND THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Function: notify when a user is followed
CREATE OR REPLACE FUNCTION public.notify_follow_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  follower_name text;
  follower_avatar text;
BEGIN
  -- Fetch minimal follower profile info
  SELECT username, avatar_url
  INTO follower_name, follower_avatar
  FROM public.profiles
  WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id,
    'follow',
    'New follower',
    COALESCE(follower_name, 'Someone') || ' started following you',
    jsonb_build_object(
      'user_id', NEW.follower_id,
      'user_name', follower_name,
      'user_avatar', follower_avatar
    )
  );

  RETURN NEW;
END; $$;

-- Trigger on follows insert
DROP TRIGGER IF EXISTS trg_notify_follow_created ON public.follows;
CREATE TRIGGER trg_notify_follow_created
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_follow_created();

-- Function: notify when a post is liked
CREATE OR REPLACE FUNCTION public.notify_post_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  post_owner uuid;
  liker_name text;
  liker_avatar text;
  post_caption text;
  post_image text;
BEGIN
  -- Get post owner and a preview
  SELECT p.user_id, p.caption, (p.media_urls->>0) -- first image url if json array of strings
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

-- Trigger on post_likes insert
DROP TRIGGER IF EXISTS trg_notify_post_liked ON public.post_likes;
CREATE TRIGGER trg_notify_post_liked
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_liked();