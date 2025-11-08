-- Normalize all existing usernames to lowercase
UPDATE profiles 
SET username = LOWER(username)
WHERE username IS NOT NULL;

-- Add a check constraint to ensure usernames are always lowercase
ALTER TABLE profiles 
ADD CONSTRAINT username_lowercase_check 
CHECK (username = LOWER(username));

-- Create a function to automatically lowercase usernames
CREATE OR REPLACE FUNCTION lowercase_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username = LOWER(NEW.username);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically lowercase usernames on insert and update
DROP TRIGGER IF EXISTS ensure_lowercase_username ON profiles;
CREATE TRIGGER ensure_lowercase_username
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION lowercase_username();