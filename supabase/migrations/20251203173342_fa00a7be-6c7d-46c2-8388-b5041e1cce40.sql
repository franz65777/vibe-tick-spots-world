-- Fix incorrect categories for existing locations

-- Central Bowling should be entertainment (bowling alley)
UPDATE locations SET category = 'entertainment' WHERE id = '256a3a0d-50eb-4782-a6a7-71f8a47752a9';

-- Dicey's Garden: pub → bar (pub is not a valid category, bar is)
UPDATE locations SET category = 'bar' WHERE id = '7c2d7943-32ca-4aaf-8d15-9d5818667e9a';

-- Encore Cafe: restaurant → cafe
UPDATE locations SET category = 'cafe' WHERE id = 'b6e7ec76-5a07-4e74-8e75-67f35e5e3286';

-- Lazy Days Cafe: restaurant → cafe
UPDATE locations SET category = 'cafe' WHERE id = '1a35efe5-eca0-451a-bb01-bdfb33c905e0';

-- Starbucks: restaurant → cafe
UPDATE locations SET category = 'cafe' WHERE id = '21161687-ed57-4b0c-a039-9faf4cc88428';