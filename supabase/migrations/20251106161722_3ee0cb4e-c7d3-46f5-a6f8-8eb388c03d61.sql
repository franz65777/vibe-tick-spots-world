-- Add invite system columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
ADD COLUMN IF NOT EXISTS invited_users_count integer DEFAULT 0;

-- Create index for invite lookups
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON profiles(invited_by);

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE invite_code = code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Trigger to auto-generate invite code for new users
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_invite_code ON profiles;
CREATE TRIGGER on_profile_invite_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();

-- Function to increment invited_users_count
CREATE OR REPLACE FUNCTION increment_inviter_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invited_by IS NOT NULL THEN
    UPDATE profiles 
    SET invited_users_count = invited_users_count + 1
    WHERE id = NEW.invited_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_invited ON profiles;
CREATE TRIGGER on_profile_invited
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.invited_by IS NOT NULL)
  EXECUTE FUNCTION increment_inviter_count();

-- Update existing profiles to have invite codes
UPDATE profiles 
SET invite_code = generate_invite_code()
WHERE invite_code IS NULL;