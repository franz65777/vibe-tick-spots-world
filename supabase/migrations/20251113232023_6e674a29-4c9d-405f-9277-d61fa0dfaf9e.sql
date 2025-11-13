-- Change expires_at default from 24 hours to 3 hours for automatic expiration
ALTER TABLE user_location_shares 
ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '3 hours');