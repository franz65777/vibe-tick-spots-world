
-- Create enum for friend request status
CREATE TYPE public.friend_request_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  requested_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status friend_request_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(requester_id, requested_id)
);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'friend_request', 'friend_accepted', 'location_like', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}' NOT NULL, -- Additional data like user_id, place_id, etc.
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for friend_requests
CREATE POLICY "Users can view friend requests involving them" ON public.friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Users can create friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update requests they're involved in" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create indexes for performance
CREATE INDEX idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX idx_friend_requests_requested ON public.friend_requests(requested_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Function to update follows table when friend request is accepted
CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Add mutual follow relationship
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.requested_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requested_id, NEW.requester_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    
    -- Create notification for the requester
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      'Your friend request has been accepted!',
      jsonb_build_object('friend_id', NEW.requested_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend request acceptance
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_friend_request_accepted();
