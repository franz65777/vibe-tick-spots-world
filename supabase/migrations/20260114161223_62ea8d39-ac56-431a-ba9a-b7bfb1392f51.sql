-- Update historical locations
UPDATE public.locations 
SET category = 'historical', updated_at = now()
WHERE id IN (
  '58df4832-4da7-44a6-abc0-4c84606a4fb3',  -- Pig's Year Public electric panel
  '054e88c9-7e64-43f7-b67b-69d931af5d38',  -- Trinity College Dublin
  '8233d8a1-55af-4ae8-a3e4-962136008304'   -- The Five Lamps
);

-- Update Dicey's Garden to nightclub (it's a known nightclub venue)
UPDATE public.locations 
SET category = 'nightclub', updated_at = now()
WHERE id = '7c2d7943-32ca-4aaf-8d15-9d5818667e9a';  -- Dicey's Garden