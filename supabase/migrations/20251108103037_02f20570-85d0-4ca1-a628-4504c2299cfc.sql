-- Ensure function is secure and search_path fixed
CREATE OR REPLACE FUNCTION public.lowercase_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username = LOWER(NEW.username);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger to be safe
DROP TRIGGER IF EXISTS ensure_lowercase_username ON public.profiles;
CREATE TRIGGER ensure_lowercase_username
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lowercase_username();

-- Enforce uniqueness from now on
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON public.profiles (username);