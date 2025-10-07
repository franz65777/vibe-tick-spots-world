-- Create function to update follower count
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE profiles 
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    -- Increment following count for the user who followed
    UPDATE profiles 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE profiles 
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the user who unfollowed
    UPDATE profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_follow_counts_trigger ON follows;

-- Create trigger for follows table
CREATE TRIGGER update_follow_counts_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_follower_count();

-- Create function to update places_visited count
CREATE OR REPLACE FUNCTION update_places_visited_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET places_visited = places_visited + 1
    WHERE id = NEW.user_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET places_visited = GREATEST(0, places_visited - 1)
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_places_visited_saved_places_trigger ON saved_places;
DROP TRIGGER IF EXISTS update_places_visited_user_saved_locations_trigger ON user_saved_locations;

-- Create trigger for saved_places table
CREATE TRIGGER update_places_visited_saved_places_trigger
AFTER INSERT OR DELETE ON saved_places
FOR EACH ROW
EXECUTE FUNCTION update_places_visited_count();

-- Create trigger for user_saved_locations table
CREATE TRIGGER update_places_visited_user_saved_locations_trigger
AFTER INSERT OR DELETE ON user_saved_locations
FOR EACH ROW
EXECUTE FUNCTION update_places_visited_count();

-- Now fix the existing data: recalculate all counts
-- Update follower counts
UPDATE profiles p
SET follower_count = (
  SELECT COUNT(*) 
  FROM follows 
  WHERE following_id = p.id
);

-- Update following counts
UPDATE profiles p
SET following_count = (
  SELECT COUNT(*) 
  FROM follows 
  WHERE follower_id = p.id
);

-- Update places_visited counts (combining both tables)
UPDATE profiles p
SET places_visited = (
  SELECT COALESCE(
    (SELECT COUNT(*) FROM saved_places WHERE user_id = p.id), 0
  ) + COALESCE(
    (SELECT COUNT(*) FROM user_saved_locations WHERE user_id = p.id), 0
  )
);