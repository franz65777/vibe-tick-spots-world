-- Fix invalid city names in saved_places by calling reverse geocoding
-- First, let's manually update the known bad entry
UPDATE public.saved_places 
SET city = NULL
WHERE city IN ('14', 'Unknown', '') OR city ~ '^\d+$';

-- Also fix locations table
UPDATE public.locations
SET city = NULL  
WHERE city IN ('14', 'Unknown', '') OR city ~ '^\d+$';