
-- Batch update cities for saved_places with missing city data based on coordinates
UPDATE saved_places
SET city = CASE
  -- A Coruña area (Spain)
  WHEN (coordinates->>'lat')::numeric BETWEEN 43.35 AND 43.38 
   AND (coordinates->>'lng')::numeric BETWEEN -8.42 AND -8.39 
  THEN 'A Coruña'
  
  -- Milan area (Italy)
  WHEN (coordinates->>'lat')::numeric BETWEEN 45.4 AND 45.5 
   AND (coordinates->>'lng')::numeric BETWEEN 9.1 AND 9.2 
  THEN 'Milan'
  
  -- Dublin area (Ireland)
  WHEN (coordinates->>'lat')::numeric BETWEEN 53.30 AND 53.35 
   AND (coordinates->>'lng')::numeric BETWEEN -6.26 AND -6.20 
  THEN 'Dublin'
  
  -- Turin area (Italy)
  WHEN (coordinates->>'lat')::numeric BETWEEN 45.0 AND 45.3 
   AND (coordinates->>'lng')::numeric BETWEEN 7.6 AND 7.7 
  THEN 'Turin'
  
  -- Abu Dhabi area (UAE)
  WHEN (coordinates->>'lat')::numeric BETWEEN 24.4 AND 24.5 
   AND (coordinates->>'lng')::numeric BETWEEN 54.5 AND 54.7 
  THEN 'Abu Dhabi'
  
  ELSE city
END
WHERE city IS NULL OR city = '' OR city = 'Unknown';
