
-- Clean up all existing locations and posts to start fresh
DELETE FROM user_saved_locations;
DELETE FROM posts;
DELETE FROM locations;
DELETE FROM saved_places;

-- Reset any sequences if needed
-- This ensures we start with a clean slate for location management
