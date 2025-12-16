-- Fix the post that was linked to the wrong location (without coordinates)
UPDATE posts 
SET location_id = '9c30aff2-4c28-4cd2-8a89-2d10661b7320' 
WHERE location_id = '7bc6a0ff-913b-4183-88d7-75d3101fb5b2';

-- Delete the duplicate location without coordinates
DELETE FROM locations 
WHERE id = '7bc6a0ff-913b-4183-88d7-75d3101fb5b2';

-- Clean up any other orphaned locations without coordinates that have no posts
DELETE FROM locations 
WHERE latitude IS NULL 
AND longitude IS NULL 
AND id NOT IN (SELECT DISTINCT location_id FROM posts WHERE location_id IS NOT NULL)
AND id NOT IN (SELECT DISTINCT location_id FROM user_saved_locations WHERE location_id IS NOT NULL);