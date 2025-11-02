-- Update cities based on address for locations with missing city data

-- Dublin locations
UPDATE locations 
SET city = 'Dublin'
WHERE city IS NULL 
  AND address LIKE '%Dublin%'
  AND id IN (
    'b45c45c1-44ba-4938-ac46-30a15c1bf5c8',
    '8a23d913-f474-4116-b9e5-a5415689ff1b',
    '19612ff3-1699-42a7-9c25-1d72211f65fa',
    '425120f2-90ee-4f2e-8aaa-f81470723c66',
    'f9e7db9b-e624-4132-87d0-768cc63fa31e',
    '9312836e-81a8-472e-be17-7103d4ba706c',
    '58df4832-4da7-44a6-abc0-4c84606a4fb3',
    '8233d8a1-55af-4ae8-a3e4-962136008304',
    '814efc0c-4111-419e-9f1d-36681d46e7c2',
    '4068c0f3-4eb2-4d55-a61f-11d9222f2f3c',
    'aa5a0208-f2bf-4b8a-a8ad-82493fa833ca',
    '35312d0a-fa75-4b27-8b8b-c0c2a7253a56',
    'af6663d1-adcd-4382-9639-1c5baaa1f683'
  );

-- Milan locations
UPDATE locations 
SET city = 'Milan'
WHERE city IS NULL 
  AND address LIKE '%Milano%'
  AND id IN (
    'e92e44ad-0634-4791-bc46-207caad1d9ac',
    'bcb231ce-6835-4d2b-9d53-65e2da9d015c'
  );

-- Turin locations  
UPDATE locations 
SET city = 'Turin'
WHERE city IS NULL 
  AND address LIKE '%Torino%'
  AND id IN ('ff3be3a8-ec83-42ad-b485-fcca6ac75d27');

-- San Francisco locations
UPDATE locations 
SET city = 'San Francisco'
WHERE city IS NULL 
  AND address LIKE '%San Francisco%'
  AND id IN ('24b81f76-95fe-43ef-b2c1-a5d64323ffd7');

-- A Coruña locations (use coordinates to identify)
UPDATE locations 
SET city = 'A Coruña'
WHERE city IS NULL 
  AND latitude BETWEEN 43.36 AND 43.37
  AND longitude BETWEEN -8.41 AND -8.40
  AND id IN (
    '0d01d4e2-5acb-47e1-927f-ad67097616d2',
    'b1089711-cdd3-42b1-9170-584123929b57',
    'b76c627e-0d2a-44ea-ba0d-17e2c661f394'
  );