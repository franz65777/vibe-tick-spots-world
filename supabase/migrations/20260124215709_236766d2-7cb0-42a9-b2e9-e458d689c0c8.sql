-- Create a direct PL/pgSQL cleanup function for expired location shares
-- This replaces the failing pg_net HTTP call with a direct database operation

CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired location shares
  DELETE FROM public.user_location_shares
  WHERE expires_at < NOW();
  
  -- Also clean up any orphaned share data older than 24 hours
  DELETE FROM public.user_location_shares
  WHERE updated_at < NOW() - INTERVAL '24 hours'
    AND expires_at IS NULL;
END;
$$;