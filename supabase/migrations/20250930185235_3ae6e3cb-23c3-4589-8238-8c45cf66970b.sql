-- Update super user level progression trigger
CREATE OR REPLACE FUNCTION public.update_super_user_points()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  points_to_add INTEGER := 0;
  target_user_id UUID;
  current_points INTEGER;
  new_level INTEGER;
BEGIN
  -- Determine points based on action
  IF TG_TABLE_NAME = 'locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 50; -- Adding a new location
    target_user_id := NEW.created_by;
  ELSIF TG_TABLE_NAME = 'location_likes' AND TG_OP = 'INSERT' THEN
    points_to_add := 5; -- Liking a location
    target_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'user_saved_locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 10; -- Saving a location
    target_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    points_to_add := 25; -- Creating a post
    target_user_id := NEW.user_id;
  END IF;
  
  IF points_to_add > 0 AND target_user_id IS NOT NULL THEN
    -- Get current super user data
    SELECT points, level INTO current_points, new_level
    FROM public.super_users
    WHERE user_id = target_user_id;
    
    -- Calculate new level based on total points
    current_points := COALESCE(current_points, 0) + points_to_add;
    new_level := GREATEST(1, current_points / 100);
    
    -- Update or create super user record
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