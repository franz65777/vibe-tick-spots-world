-- 1. Cambia default a 100 anni (notifiche permanenti)
ALTER TABLE notifications 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '100 years');

-- 2. Aggiorna notifiche esistenti non-location_share per non farle scadere
UPDATE notifications 
SET expires_at = now() + interval '100 years'
WHERE type NOT IN ('location_share', 'business_post', 'business_review', 'location_save', 'business_mention');