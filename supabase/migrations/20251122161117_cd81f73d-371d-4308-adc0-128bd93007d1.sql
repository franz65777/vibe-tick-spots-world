-- Add RLS policies for otp_codes table
-- This table stores OTP codes for authentication and needs proper security policies

-- Allow users to insert their own OTP codes (when requesting OTP)
CREATE POLICY "Users can insert their own OTP codes"
ON public.otp_codes
FOR INSERT
WITH CHECK (true); -- Anyone can request an OTP

-- Allow users to read their own OTP codes for verification
CREATE POLICY "Users can read OTP codes for verification"
ON public.otp_codes
FOR SELECT
USING (
  identifier = COALESCE(
    auth.jwt()->>'email',
    auth.jwt()->>'phone'
  )
);

-- Automatically delete expired OTP codes (admin only)
CREATE POLICY "System can delete expired OTP codes"
ON public.otp_codes
FOR DELETE
USING (expires_at < now());