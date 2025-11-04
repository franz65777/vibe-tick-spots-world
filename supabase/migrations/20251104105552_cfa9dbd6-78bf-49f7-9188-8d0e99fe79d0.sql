-- Insert business-specific badges into the badges table

-- Post & Content Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
('First Post', 'Published your first post showcasing your business', '📸', '{"type": "post_count", "threshold": 1, "category": "content"}'),
('Content Creator', 'Published 10 posts to engage your audience', '🎨', '{"type": "post_count", "threshold": 10, "category": "content"}'),
('Social Star', 'Published 50 posts - you''re a social media pro!', '⭐', '{"type": "post_count", "threshold": 50, "category": "content"}'),
('Content Master', 'Published 100+ posts - true content excellence', '👑', '{"type": "post_count", "threshold": 100, "category": "content"}');

-- Engagement & Popularity Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
('Popular Spot', 'Your location has been saved 50 times', '❤️', '{"type": "saves_count", "threshold": 50, "category": "engagement"}'),
('Community Favorite', 'Your location has been saved 100 times', '🌟', '{"type": "saves_count", "threshold": 100, "category": "engagement"}'),
('Local Legend', 'Your location has been saved 500+ times', '🏆', '{"type": "saves_count", "threshold": 500, "category": "engagement"}'),
('Trending Now', 'Your posts have been shared 100+ times', '🔥', '{"type": "shares_count", "threshold": 100, "category": "engagement"}');

-- Marketing & Promotion Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
('First Campaign', 'Sent your first business notification', '📢', '{"type": "notification_count", "threshold": 1, "category": "marketing"}'),
('Marketing Pro', 'Sent 10 successful marketing campaigns', '📊', '{"type": "notification_count", "threshold": 10, "category": "marketing"}'),
('Promotion Expert', 'Sent 25+ campaigns to engage customers', '🎯', '{"type": "notification_count", "threshold": 25, "category": "marketing"}');

-- Customer Service Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
('Quick Responder', 'Responded to 10 customer messages within 1 hour', '⚡', '{"type": "quick_response_count", "threshold": 10, "time_limit_hours": 1, "category": "service"}'),
('Customer Champion', 'Maintained 90%+ response rate to messages', '💬', '{"type": "response_rate", "threshold": 90, "category": "service"}'),
('Communication Pro', 'Responded to 100+ customer inquiries', '🤝', '{"type": "message_response_count", "threshold": 100, "category": "service"}');

-- Growth & Milestone Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
('Rising Star', 'Gained 50 saves in a single week', '🚀', '{"type": "weekly_saves_growth", "threshold": 50, "category": "growth"}'),
('Rapid Growth', 'Gained 200 saves in a single month', '📈', '{"type": "monthly_saves_growth", "threshold": 200, "category": "growth"}'),
('Established', 'Active business account for 6 months', '🏢', '{"type": "account_age_months", "threshold": 6, "category": "milestone"}'),
('Veteran', 'Active business account for 1 year', '🎖️', '{"type": "account_age_months", "threshold": 12, "category": "milestone"}');

-- Quality & Consistency Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
('Consistent Creator', 'Posted at least once per week for 4 consecutive weeks', '📅', '{"type": "consistent_posting", "weeks": 4, "min_per_week": 1, "category": "quality"}'),
('Daily Poster', 'Posted every day for 7 consecutive days', '🔄', '{"type": "daily_posting_streak", "days": 7, "category": "quality"}'),
('High Quality', 'Average post engagement rate above 10%', '✨', '{"type": "engagement_rate", "threshold": 10, "category": "quality"}');

-- Event & Special Occasion Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
('Event Host', 'Created a post about a special event at your location', '🎉', '{"type": "event_post_count", "threshold": 1, "category": "events"}'),
('Festival Organizer', 'Hosted 5+ events at your location', '🎪', '{"type": "event_post_count", "threshold": 5, "category": "events"}'),
('Special Deals', 'Promoted a discount or special offer', '🎁', '{"type": "discount_notification", "threshold": 1, "category": "promotions"}'),
('Deal Master', 'Promoted 10+ special offers to customers', '💰', '{"type": "discount_notification", "threshold": 10, "category": "promotions"}');

-- Reservation & Booking Badges (if applicable)
INSERT INTO badges (name, description, icon, criteria) VALUES
('First Booking', 'Received your first reservation through the app', '📋', '{"type": "reservation_count", "threshold": 1, "category": "bookings"}'),
('Booking Pro', 'Received 50+ reservations through the app', '📅', '{"type": "reservation_count", "threshold": 50, "category": "bookings"}'),
('Fully Booked', 'Had 100% reservation capacity for a week', '🔒', '{"type": "full_capacity_days", "threshold": 7, "category": "bookings"}');