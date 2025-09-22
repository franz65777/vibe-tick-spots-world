-- Add a few test locations with proper coordinates for Google Maps testing
INSERT INTO public.locations (
  name, 
  category, 
  address, 
  latitude, 
  longitude, 
  city, 
  country,
  created_by,
  pioneer_user_id,
  google_place_id,
  description
) VALUES 
(
  'Golden Gate Bridge', 
  'landmark', 
  'Golden Gate Bridge, San Francisco, CA, USA', 
  37.8199, 
  -122.4783, 
  'San Francisco', 
  'USA',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  'ChIJw____96GhYAR_BZUGjG8KBQ',
  'Iconic suspension bridge connecting San Francisco and Marin County'
),
(
  'Central Park', 
  'park', 
  'Central Park, New York, NY, USA', 
  40.7829, 
  -73.9654, 
  'New York', 
  'USA',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  'ChIJ4zGFAZpYwokRGUGph3Mf37k',
  'Large public park in Manhattan, New York City'
),
(
  'Eiffel Tower', 
  'landmark', 
  'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France', 
  48.8584, 
  2.2945, 
  'Paris', 
  'France',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  'ChIJLU7jZClu5kcR4PcOOO6p3I0',
  'Iconic iron lattice tower in Paris'
),
(
  'Times Square', 
  'landmark', 
  'Times Square, New York, NY, USA', 
  40.7580, 
  -73.9855, 
  'New York', 
  'USA',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  'ChIJmQJIxlVYwokRLgeuocVOGVU',
  'Major commercial intersection and neighborhood in Manhattan'
),
(
  'Fishermans Wharf', 
  'tourist_attraction', 
  'Fishermans Wharf, San Francisco, CA, USA', 
  37.8080, 
  -122.4177, 
  'San Francisco', 
  'USA',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  '101423bc-a06c-40cc-8bb9-42af76946e4d',
  'ChIJmQqIXSuHhYARQnEdq0Y1Yzw',
  'Popular tourist area with restaurants and shops'
);