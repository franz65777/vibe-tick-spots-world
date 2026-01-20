-- Performance indexes for notification queries (Critical for 5000+ users)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
  ON public.notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_expires 
  ON public.notifications(user_id, is_read, expires_at DESC);

-- Performance indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_posts_user_created_desc 
  ON public.posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_location_created 
  ON public.posts(location_id, created_at DESC) WHERE location_id IS NOT NULL;

-- Performance indexes for map locations
CREATE INDEX IF NOT EXISTS idx_user_saved_locations_user_created 
  ON public.user_saved_locations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_places_user_city 
  ON public.saved_places(user_id, city);

CREATE INDEX IF NOT EXISTS idx_saved_places_place_id 
  ON public.saved_places(place_id);

-- Performance indexes for follows (critical for feed generation)
CREATE INDEX IF NOT EXISTS idx_follows_follower_id 
  ON public.follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id 
  ON public.follows(following_id);

-- Performance indexes for stories
CREATE INDEX IF NOT EXISTS idx_stories_user_expires 
  ON public.stories(user_id, expires_at DESC);

-- Performance indexes for comment likes (used in notifications)
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment 
  ON public.comment_likes(user_id, comment_id);

-- Performance indexes for user location shares
CREATE INDEX IF NOT EXISTS idx_user_location_shares_user_location 
  ON public.user_location_shares(user_id, location_id, expires_at);

-- Performance indexes for friend requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester_status 
  ON public.friend_requests(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requested_status 
  ON public.friend_requests(requested_id, status);

-- Performance indexes for user privacy settings
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_private 
  ON public.user_privacy_settings(user_id, is_private);

-- Performance indexes for user mutes
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter_muted 
  ON public.user_mutes(muter_id, muted_user_id) WHERE is_muted = true;