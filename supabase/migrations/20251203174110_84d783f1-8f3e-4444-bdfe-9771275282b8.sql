-- Fix Oscar Wilde House category: entertainment → museum
UPDATE locations SET category = 'museum' WHERE id = '907b1a7e-5aaf-40cb-b2ed-bee8543fb6f8';

-- Remove duplicate "Little Basils" from saved_places (keeping the one in locations table as "Little Basil")
DELETE FROM saved_places WHERE id = '42983591-f6b4-401c-9488-e7aa92212d1d';