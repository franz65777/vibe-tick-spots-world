-- Ensure case-insensitive unique usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
ON public.profiles (lower(username));

-- Optionally ensure username is trimmed (no trailing spaces)
-- Note: We don't enforce here to avoid breaking existing data; consider a cleanup job.

-- For performance on availability checks
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
