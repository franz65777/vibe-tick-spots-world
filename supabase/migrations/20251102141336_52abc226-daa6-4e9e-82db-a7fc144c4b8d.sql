
-- Update remaining problematic cities
UPDATE saved_places
SET city = CASE
  -- Kuala Lumpur area (Malaysia) - coordinates around 3.x, 101.x
  WHEN (coordinates->>'lat')::numeric BETWEEN 3.0 AND 3.5 
   AND (coordinates->>'lng')::numeric BETWEEN 101.5 AND 102.0 
  THEN 'Kuala Lumpur'
  
  -- Abu Dhabi area - additional coordinates
  WHEN (coordinates->>'lat')::numeric BETWEEN 24.3 AND 24.5 
   AND (coordinates->>'lng')::numeric BETWEEN 54.3 AND 54.65 
  THEN 'Abu Dhabi'
  
  ELSE city
END
WHERE city IS NULL 
   OR city = 'Ground Floor' 
   OR city = 'Persimpangan Bertingkat Lebuhraya Karak' 
   OR city = 'Unknown';
