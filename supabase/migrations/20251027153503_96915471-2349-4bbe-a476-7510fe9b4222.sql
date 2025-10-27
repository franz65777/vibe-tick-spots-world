-- Add language preference to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Optional: comment for clarity
COMMENT ON COLUMN public.profiles.language IS 'ISO language code preference for UI/localization (e.g., en, it, es, fr, de, pt)';