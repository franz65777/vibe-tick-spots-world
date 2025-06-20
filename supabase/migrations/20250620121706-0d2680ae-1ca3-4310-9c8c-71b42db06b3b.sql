
-- Create place_likes table for tracking user likes on places
CREATE TABLE IF NOT EXISTS public.place_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create saved_places table for user saved places
CREATE TABLE IF NOT EXISTS public.saved_places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id text NOT NULL,
  place_name text NOT NULL,
  place_category text,
  city text,
  coordinates jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create place_comments table for place comments
CREATE TABLE IF NOT EXISTS public.place_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create shared_places table for sharing places with friends
CREATE TABLE IF NOT EXISTS public.shared_places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id text NOT NULL,
  place_name text NOT NULL,
  place_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add unique constraints to prevent duplicate likes and saves
ALTER TABLE public.place_likes ADD CONSTRAINT unique_user_place_like UNIQUE (user_id, place_id);
ALTER TABLE public.saved_places ADD CONSTRAINT unique_user_place_save UNIQUE (user_id, place_id);

-- Enable RLS on all tables
ALTER TABLE public.place_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_places ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for place_likes
CREATE POLICY "Users can view all place likes" ON public.place_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own place likes" ON public.place_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own place likes" ON public.place_likes FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for saved_places
CREATE POLICY "Users can view their own saved places" ON public.saved_places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saved places" ON public.saved_places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved places" ON public.saved_places FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for place_comments
CREATE POLICY "Users can view all place comments" ON public.place_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own place comments" ON public.place_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own place comments" ON public.place_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own place comments" ON public.place_comments FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for shared_places
CREATE POLICY "Users can view shared places sent to them" ON public.shared_places FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
CREATE POLICY "Users can insert shared places" ON public.shared_places FOR INSERT WITH CHECK (auth.uid() = sender_id);
