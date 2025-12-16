-- Fix the broken post to point to the correct National Gallery location (with coordinates)
UPDATE posts 
SET location_id = 'c07aa7e1-5622-4648-bff0-ed89ebffbb91'
WHERE id = '8414e25c-9045-42c2-ad37-eb7ef3674186';

-- Delete the duplicate location without coordinates
DELETE FROM locations 
WHERE id = '512d1837-3fcf-4e3a-8a38-6ec0d170174e';