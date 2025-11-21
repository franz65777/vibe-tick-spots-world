-- Fix security: Drop trigger first, then recreate function with search_path
DROP TRIGGER IF EXISTS update_trip_location_likes_count_trigger ON trip_location_likes;
DROP FUNCTION IF EXISTS update_trip_location_likes_count();

CREATE OR REPLACE FUNCTION update_trip_location_likes_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE trip_locations SET likes_count = likes_count + 1 WHERE id = NEW.trip_location_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE trip_locations SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.trip_location_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_trip_location_likes_count_trigger
AFTER INSERT OR DELETE ON trip_location_likes
FOR EACH ROW EXECUTE FUNCTION update_trip_location_likes_count();