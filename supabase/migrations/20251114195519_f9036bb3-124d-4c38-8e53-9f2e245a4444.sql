-- Reset is_business_post per post senza content_type speciale
UPDATE posts 
SET is_business_post = false
WHERE (content_type IS NULL OR content_type NOT IN ('discount', 'event', 'promotion', 'announcement'))
AND is_business_post = true;