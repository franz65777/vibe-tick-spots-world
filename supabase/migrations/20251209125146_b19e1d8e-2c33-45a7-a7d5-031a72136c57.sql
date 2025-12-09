-- Update all existing saved places to use 'been' category for visited places
UPDATE saved_places SET save_tag = 'been' WHERE save_tag NOT IN ('been', 'to_try', 'favourite') OR save_tag IS NULL;

-- Also update user_saved_locations if it has save_tag column
UPDATE user_saved_locations SET save_tag = 'been' WHERE save_tag NOT IN ('been', 'to_try', 'favourite') OR save_tag IS NULL;