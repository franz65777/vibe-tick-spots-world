-- Fix the trigger function to handle different column names for different tables
CREATE OR REPLACE FUNCTION public.update_super_user_points()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  points_to_add INTEGER := 0;
  target_user_id UUID;
BEGIN
  -- Determine points based on action
  IF TG_TABLE_NAME = 'locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 50; -- Adding a new location
    target_user_id := NEW.created_by; -- Use created_by for locations table
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
    -- Update or create super user record
    INSERT INTO public.super_users (user_id, points, weekly_contributions, total_contributions)
    VALUES (target_user_id, points_to_add, 1, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET 
      points = super_users.points + points_to_add,
      weekly_contributions = super_users.weekly_contributions + 1,
      total_contributions = super_users.total_contributions + 1,
      level = GREATEST(1, (super_users.points + points_to_add) / 100),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;