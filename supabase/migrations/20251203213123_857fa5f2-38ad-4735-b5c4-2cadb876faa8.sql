-- Clear all FK references to this profile
UPDATE locations SET created_by = NULL WHERE created_by = 'b22ddd5b-b158-497e-b4da-8cef6db5636f';
UPDATE locations SET pioneer_user_id = NULL WHERE pioneer_user_id = 'b22ddd5b-b158-497e-b4da-8cef6db5636f';

-- Delete the orphaned profile
DELETE FROM profiles WHERE id = 'b22ddd5b-b158-497e-b4da-8cef6db5636f';