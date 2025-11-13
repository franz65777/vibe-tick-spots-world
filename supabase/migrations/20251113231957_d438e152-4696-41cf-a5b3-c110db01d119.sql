-- Cleanup expired location shares
DELETE FROM user_location_shares WHERE expires_at < NOW();

-- Also delete old expired shares that might have been left around
DELETE FROM user_location_shares WHERE created_at < NOW() - INTERVAL '7 days';