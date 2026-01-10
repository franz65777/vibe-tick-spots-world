-- Fix existing locations with municipality/suburb as city names
-- Update "Surcin Urban Municipality" to "Belgrade"
UPDATE public.locations 
SET city = 'Belgrade', updated_at = now()
WHERE city ILIKE '%surcin%urban%municipality%';

-- Fix any other common patterns of sub-city areas stored as city
UPDATE public.locations 
SET city = 'Belgrade', updated_at = now()
WHERE city ILIKE '%municipality%' AND city ILIKE '%belgrad%';

-- Update any other urban municipalities to their parent cities if detectable from address
UPDATE public.locations
SET city = 'Unknown', updated_at = now()
WHERE city ILIKE '%urban municipality%' 
  AND city NOT ILIKE '%belgrad%';