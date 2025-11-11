-- Create table for user location check-ins/shares
CREATE TABLE IF NOT EXISTS public.user_location_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('all_followers', 'close_friends', 'specific_users')),
  shared_with_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for close friends list
CREATE TABLE IF NOT EXISTS public.close_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.user_location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_location_shares
CREATE POLICY "Users can view location shares they have access to"
ON public.user_location_shares
FOR SELECT
USING (
  -- Own shares
  auth.uid() = user_id
  OR
  -- Shares for all followers
  (share_type = 'all_followers' AND EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = auth.uid() AND following_id = user_id
  ))
  OR
  -- Shares for close friends
  (share_type = 'close_friends' AND EXISTS (
    SELECT 1 FROM public.close_friends 
    WHERE user_id = user_location_shares.user_id AND friend_id = auth.uid()
  ))
  OR
  -- Specific user shares
  (share_type = 'specific_users' AND auth.uid() = ANY(shared_with_user_ids))
);

CREATE POLICY "Users can create their own location shares"
ON public.user_location_shares
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location shares"
ON public.user_location_shares
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location shares"
ON public.user_location_shares
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for close_friends
CREATE POLICY "Users can view their own close friends list"
ON public.close_friends
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can add to their close friends list"
ON public.close_friends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their close friends list"
ON public.close_friends
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_location_shares_user_id ON public.user_location_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_shares_location_id ON public.user_location_shares(location_id);
CREATE INDEX IF NOT EXISTS idx_user_location_shares_expires_at ON public.user_location_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_close_friends_user_id ON public.close_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_close_friends_friend_id ON public.close_friends(friend_id);

-- Create function for automatic cleanup of expired shares
CREATE OR REPLACE FUNCTION public.cleanup_expired_location_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_location_shares
  WHERE expires_at < now();
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_location_share_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_location_shares_updated_at
BEFORE UPDATE ON public.user_location_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_location_share_timestamp();