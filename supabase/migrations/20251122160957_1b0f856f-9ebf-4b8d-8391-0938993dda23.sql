-- Fix function search path security issues
-- These functions are missing SET search_path which makes them vulnerable to search_path attacks

-- Fix cleanup_old_analytics function
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM user_analytics 
  WHERE created_at < now() - interval '90 days';
END;
$function$;

-- Fix cleanup_expired_stories function
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM stories WHERE expires_at < now();
END;
$function$;

-- Fix cleanup_expired_location_shares function
CREATE OR REPLACE FUNCTION public.cleanup_expired_location_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.user_location_shares
  WHERE expires_at < now();
END;
$function$;

-- Fix update_location_share_timestamp function
CREATE OR REPLACE FUNCTION public.update_location_share_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_thread_last_message function
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO message_threads (participant_1_id, participant_2_id, last_message_id, last_message_at)
  VALUES (
    LEAST(NEW.sender_id, NEW.receiver_id),
    GREATEST(NEW.sender_id, NEW.receiver_id),
    NEW.id,
    NEW.created_at
  )
  ON CONFLICT (participant_1_id, participant_2_id) 
  DO UPDATE SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at;
  
  RETURN NEW;
END;
$function$;

-- Fix update_post_comments_count function
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_post_likes_count function
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_post_saves_count function
CREATE OR REPLACE FUNCTION public.update_post_saves_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET saves_count = saves_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_post_shares_count function
CREATE OR REPLACE FUNCTION public.update_post_shares_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_comment_likes_count function
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_posts_count_on_insert function
CREATE OR REPLACE FUNCTION public.update_posts_count_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET posts_count = posts_count + 1 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$function$;

-- Fix update_posts_count_on_delete function
CREATE OR REPLACE FUNCTION public.update_posts_count_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET posts_count = GREATEST(posts_count - 1, 0)
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$function$;

-- Fix update_user_stats function
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'follows' THEN
    UPDATE public.profiles 
    SET follower_count = (
      SELECT COUNT(*) FROM public.follows WHERE following_id = NEW.following_id
    )
    WHERE id = NEW.following_id;
    
    UPDATE public.profiles 
    SET following_count = (
      SELECT COUNT(*) FROM public.follows WHERE follower_id = NEW.follower_id
    )
    WHERE id = NEW.follower_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_super_user_points function
CREATE OR REPLACE FUNCTION public.update_super_user_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  points_to_add INTEGER := 0;
  target_user_id UUID;
  current_points INTEGER;
  new_level INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 50;
    target_user_id := NEW.created_by;
  ELSIF TG_TABLE_NAME = 'location_likes' AND TG_OP = 'INSERT' THEN
    points_to_add := 5;
    target_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'user_saved_locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 10;
    target_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    points_to_add := 25;
    target_user_id := NEW.user_id;
  END IF;
  
  IF points_to_add > 0 AND target_user_id IS NOT NULL THEN
    SELECT points, level INTO current_points, new_level
    FROM public.super_users
    WHERE user_id = target_user_id;
    
    current_points := COALESCE(current_points, 0) + points_to_add;
    new_level := GREATEST(1, current_points / 100);
    
    INSERT INTO public.super_users (user_id, points, level, weekly_contributions, total_contributions, status)
    VALUES (
      target_user_id, 
      current_points, 
      new_level, 
      1, 
      1,
      CASE WHEN new_level >= 10 THEN 'elite' ELSE 'active' END
    )
    ON CONFLICT (user_id)
    DO UPDATE SET 
      points = current_points,
      level = new_level,
      weekly_contributions = super_users.weekly_contributions + 1,
      total_contributions = super_users.total_contributions + 1,
      status = CASE WHEN new_level >= 10 THEN 'elite' ELSE super_users.status END,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;