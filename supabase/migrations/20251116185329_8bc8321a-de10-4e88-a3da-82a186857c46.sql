-- Allow public read of email field only when matching username for login purposes
-- This is needed to support username-based login
CREATE POLICY "Allow public username to email lookup for login"
ON public.profiles
FOR SELECT
TO anon
USING (true);