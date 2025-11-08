-- Create table for storing OTP codes temporarily
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or phone
  code TEXT NOT NULL,
  session_token TEXT, -- for verified sessions
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_identifier ON public.otp_codes(identifier);
CREATE INDEX IF NOT EXISTS idx_otp_codes_session_token ON public.otp_codes(session_token);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - this table is only accessed via Edge Functions with service role

-- Auto-cleanup expired codes (runs daily)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < NOW();
END;
$$;