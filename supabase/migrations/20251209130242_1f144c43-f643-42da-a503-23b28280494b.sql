-- Remove duplicate saved_places entries, keeping only the most recent one per user+place_id
DELETE FROM saved_places
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, place_id) id
  FROM saved_places
  ORDER BY user_id, place_id, created_at DESC
);

-- Remove duplicate user_saved_locations entries, keeping only the most recent one per user+location_id
DELETE FROM user_saved_locations
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, location_id) id
  FROM user_saved_locations
  ORDER BY user_id, location_id, created_at DESC
);