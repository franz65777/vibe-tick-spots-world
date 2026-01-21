-- Performance indexes for 5k+ users scale (fixed)

-- Notifications: fast lookup by user + ordering
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- Locations: filter by city and category
CREATE INDEX IF NOT EXISTS idx_locations_city_category 
ON locations(city, category);

-- Locations: geo queries
CREATE INDEX IF NOT EXISTS idx_locations_lat_lng 
ON locations(latitude, longitude);

-- Saved locations: user lookups
CREATE INDEX IF NOT EXISTS idx_user_saved_locations_user 
ON user_saved_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_saved_locations_location 
ON user_saved_locations(location_id);

-- Posts: feed performance
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON posts(user_id, created_at DESC);

-- Posts: location-based queries
CREATE INDEX IF NOT EXISTS idx_posts_location 
ON posts(location_id) WHERE location_id IS NOT NULL;

-- Direct messages: conversation thread performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_receiver 
ON direct_messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_unread 
ON direct_messages(receiver_id, is_read) WHERE is_read = false;

-- Stories: active stories query (without partial index on now())
CREATE INDEX IF NOT EXISTS idx_stories_user_expires 
ON stories(user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_expires 
ON stories(expires_at DESC);

-- Follows: follower/following lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower 
ON follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_following 
ON follows(following_id);

-- Marketing campaigns: active campaign queries (without now() in predicate)
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_location_active 
ON marketing_campaigns(location_id, end_date) 
WHERE is_active = true;

-- Saved places: user lookups
CREATE INDEX IF NOT EXISTS idx_saved_places_user 
ON saved_places(user_id);

-- Post comments: post lookups
CREATE INDEX IF NOT EXISTS idx_post_comments_post 
ON post_comments(post_id, created_at DESC);