-- Add streak tracking to super_users table
ALTER TABLE public.super_users
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date date;

-- Create challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  challenge_type text NOT NULL, -- 'daily', 'weekly', 'seasonal', 'city_specific'
  category text, -- 'exploration', 'social', 'content'
  city text, -- NULL for global challenges
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  reward_points integer NOT NULL DEFAULT 50,
  reward_badge_id uuid,
  target_count integer NOT NULL DEFAULT 1,
  target_action text NOT NULL, -- 'visit', 'save', 'review', 'post', 'follow'
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create user_challenge_progress table
CREATE TABLE public.user_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  current_count integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenges
CREATE POLICY "Everyone can view active challenges"
ON public.challenges FOR SELECT
USING (is_active = true);

-- RLS Policies for user_challenge_progress
CREATE POLICY "Users can view their own challenge progress"
ON public.user_challenge_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge progress"
ON public.user_challenge_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
ON public.user_challenge_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update user streak
CREATE OR REPLACE FUNCTION public.update_user_streak(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_activity date;
  current_streak_val integer;
  longest_streak_val integer;
BEGIN
  -- Get current streak data
  SELECT last_activity_date, current_streak, longest_streak
  INTO last_activity, current_streak_val, longest_streak_val
  FROM public.super_users
  WHERE user_id = target_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.super_users (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (target_user_id, 1, 1, CURRENT_DATE);
    RETURN;
  END IF;
  
  -- Check if activity is today
  IF last_activity = CURRENT_DATE THEN
    -- Already logged today, no change needed
    RETURN;
  END IF;
  
  -- Check if activity was yesterday (continuing streak)
  IF last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    current_streak_val := current_streak_val + 1;
    longest_streak_val := GREATEST(longest_streak_val, current_streak_val);
  ELSE
    -- Streak broken, reset to 1
    current_streak_val := 1;
  END IF;
  
  -- Update the record
  UPDATE public.super_users
  SET 
    current_streak = current_streak_val,
    longest_streak = longest_streak_val,
    last_activity_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

-- Function to check and complete challenges
CREATE OR REPLACE FUNCTION public.check_challenge_completion(
  target_user_id uuid,
  action_type text,
  action_city text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenge_record RECORD;
  progress_record RECORD;
BEGIN
  -- Find active challenges matching the action
  FOR challenge_record IN
    SELECT * FROM public.challenges
    WHERE is_active = true
      AND target_action = action_type
      AND NOW() BETWEEN start_date AND end_date
      AND (city IS NULL OR city = action_city)
  LOOP
    -- Get or create progress record
    SELECT * INTO progress_record
    FROM public.user_challenge_progress
    WHERE user_id = target_user_id
      AND challenge_id = challenge_record.id;
    
    IF NOT FOUND THEN
      INSERT INTO public.user_challenge_progress (user_id, challenge_id, current_count)
      VALUES (target_user_id, challenge_record.id, 1);
      progress_record.current_count := 1;
    ELSE
      UPDATE public.user_challenge_progress
      SET 
        current_count = current_count + 1,
        updated_at = now()
      WHERE user_id = target_user_id
        AND challenge_id = challenge_record.id;
      progress_record.current_count := progress_record.current_count + 1;
    END IF;
    
    -- Check if challenge is completed
    IF progress_record.current_count >= challenge_record.target_count AND NOT COALESCE(progress_record.completed, false) THEN
      UPDATE public.user_challenge_progress
      SET 
        completed = true,
        completed_at = now()
      WHERE user_id = target_user_id
        AND challenge_id = challenge_record.id;
      
      -- Award points
      UPDATE public.super_users
      SET points = points + challenge_record.reward_points
      WHERE user_id = target_user_id;
    END IF;
  END LOOP;
END;
$$;

-- Insert sample challenges
INSERT INTO public.challenges (title, description, challenge_type, category, start_date, end_date, reward_points, target_count, target_action) VALUES
('Museum Explorer', 'Visit a museum this week', 'weekly', 'exploration', NOW(), NOW() + INTERVAL '7 days', 100, 1, 'visit'),
('Café Hopper', 'Save 3 new cafés today', 'daily', 'exploration', NOW(), NOW() + INTERVAL '1 day', 50, 3, 'save'),
('Social Butterfly', 'Follow 5 new explorers', 'weekly', 'social', NOW(), NOW() + INTERVAL '7 days', 75, 5, 'follow'),
('Content Creator', 'Post 2 location reviews', 'weekly', 'content', NOW(), NOW() + INTERVAL '7 days', 100, 2, 'review'),
('Weekend Wanderer', 'Save 5 places this weekend', 'weekly', 'exploration', NOW(), NOW() + INTERVAL '7 days', 150, 5, 'save');

-- Create indexes
CREATE INDEX idx_challenges_active ON public.challenges(is_active, start_date, end_date);
CREATE INDEX idx_challenges_city ON public.challenges(city) WHERE city IS NOT NULL;
CREATE INDEX idx_user_challenge_progress_user ON public.user_challenge_progress(user_id);
CREATE INDEX idx_user_challenge_progress_challenge ON public.user_challenge_progress(challenge_id);
CREATE INDEX idx_super_users_streak ON public.super_users(current_streak DESC);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_challenge_progress;