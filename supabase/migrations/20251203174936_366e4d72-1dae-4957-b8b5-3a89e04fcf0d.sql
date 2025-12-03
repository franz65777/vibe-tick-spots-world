-- Fix The Orange Goat category: restaurant → cafe (place_types shows cafe first)
UPDATE locations SET category = 'cafe' WHERE id = 'f9e7db9b-e624-4132-87d0-768cc63fa31e';