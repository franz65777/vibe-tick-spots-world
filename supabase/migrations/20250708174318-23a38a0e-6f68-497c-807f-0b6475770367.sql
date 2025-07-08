-- Create a table to track weekly location metrics
CREATE TABLE public.weekly_location_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  visits_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(location_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_location_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for weekly location metrics
CREATE POLICY "Everyone can view weekly metrics" 
ON public.weekly_location_metrics 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage weekly metrics" 
ON public.weekly_location_metrics 
FOR ALL 
USING (true);

-- Create a table for super users and gamification
CREATE TABLE public.super_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'elite')),
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  weekly_contributions INTEGER DEFAULT 0,
  total_contributions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS for super users
ALTER TABLE public.super_users ENABLE ROW LEVEL SECURITY;

-- Create policies for super users
CREATE POLICY "Everyone can view super users" 
ON public.super_users 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their super user status" 
ON public.super_users 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to update weekly metrics
CREATE OR REPLACE FUNCTION public.update_weekly_location_metrics()
RETURNS TRIGGER AS $$
DECLARE
  week_start DATE;
  location_uuid UUID;
BEGIN
  -- Get the Monday of the current week
  week_start := DATE_TRUNC('week', CURRENT_DATE);
  
  -- Handle different trigger scenarios
  IF TG_TABLE_NAME = 'location_likes' THEN
    location_uuid := COALESCE(NEW.location_id, OLD.location_id);
    
    -- Update or insert weekly metrics for likes
    INSERT INTO public.weekly_location_metrics (location_id, week_start, likes_count)
    VALUES (location_uuid, week_start, 1)
    ON CONFLICT (location_id, week_start)
    DO UPDATE SET 
      likes_count = weekly_location_metrics.likes_count + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END,
      updated_at = now();
      
  ELSIF TG_TABLE_NAME = 'user_saved_locations' THEN
    location_uuid := COALESCE(NEW.location_id, OLD.location_id);
    
    -- Update or insert weekly metrics for saves
    INSERT INTO public.weekly_location_metrics (location_id, week_start, saves_count)
    VALUES (location_uuid, week_start, 1)
    ON CONFLICT (location_id, week_start)
    DO UPDATE SET 
      saves_count = weekly_location_metrics.saves_count + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END,
      updated_at = now();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for weekly metrics tracking
CREATE TRIGGER update_weekly_likes_metrics
  AFTER INSERT OR DELETE ON public.location_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_weekly_location_metrics();

CREATE TRIGGER update_weekly_saves_metrics
  AFTER INSERT OR DELETE ON public.user_saved_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_weekly_location_metrics();

-- Create function to get location of the week (libraries only)
CREATE OR REPLACE FUNCTION public.get_location_of_the_week()
RETURNS TABLE (
  location_id UUID,
  location_name TEXT,
  location_category TEXT,
  location_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  image_url TEXT,
  total_likes INTEGER,
  total_saves INTEGER,
  total_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.category,
    l.address,
    l.latitude,
    l.longitude,
    l.image_url,
    COALESCE(wlm.likes_count, 0) as total_likes,
    COALESCE(wlm.saves_count, 0) as total_saves,
    COALESCE(wlm.likes_count * 2 + wlm.saves_count, 0) as total_score
  FROM public.locations l
  LEFT JOIN public.weekly_location_metrics wlm ON l.id = wlm.location_id 
    AND wlm.week_start = DATE_TRUNC('week', CURRENT_DATE)
  WHERE l.category ILIKE '%library%' 
    OR l.category ILIKE '%book%'
    OR l.name ILIKE '%library%'
    OR l.name ILIKE '%book%'
  ORDER BY total_score DESC, total_likes DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to update super user points
CREATE OR REPLACE FUNCTION public.update_super_user_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_add INTEGER := 0;
BEGIN
  -- Determine points based on action
  IF TG_TABLE_NAME = 'locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 50; -- Adding a new location
  ELSIF TG_TABLE_NAME = 'location_likes' AND TG_OP = 'INSERT' THEN
    points_to_add := 5; -- Liking a location
  ELSIF TG_TABLE_NAME = 'user_saved_locations' AND TG_OP = 'INSERT' THEN
    points_to_add := 10; -- Saving a location
  ELSIF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    points_to_add := 25; -- Creating a post
  END IF;
  
  IF points_to_add > 0 THEN
    -- Update or create super user record
    INSERT INTO public.super_users (user_id, points, weekly_contributions, total_contributions)
    VALUES (NEW.user_id, points_to_add, 1, 1)
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
$$ LANGUAGE plpgsql;

-- Create triggers for super user points
CREATE TRIGGER update_points_for_locations
  AFTER INSERT ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_super_user_points();

CREATE TRIGGER update_points_for_likes
  AFTER INSERT ON public.location_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_super_user_points();

CREATE TRIGGER update_points_for_saves
  AFTER INSERT ON public.user_saved_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_super_user_points();

CREATE TRIGGER update_points_for_posts
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_super_user_points();