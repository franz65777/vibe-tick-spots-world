-- Create table for location rankings (1-10)
CREATE TABLE IF NOT EXISTS public.location_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 1 AND score <= 10),
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_rankings ENABLE ROW LEVEL SECURITY;

-- Policies: allow public read, restrict write to admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'location_rankings' AND policyname = 'Anyone can view location rankings'
  ) THEN
    CREATE POLICY "Anyone can view location rankings"
    ON public.location_rankings FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'location_rankings' AND policyname = 'Admins can insert rankings'
  ) THEN
    CREATE POLICY "Admins can insert rankings"
    ON public.location_rankings FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'location_rankings' AND policyname = 'Admins can update rankings'
  ) THEN
    CREATE POLICY "Admins can update rankings"
    ON public.location_rankings FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'location_rankings' AND policyname = 'Admins can delete rankings'
  ) THEN
    CREATE POLICY "Admins can delete rankings"
    ON public.location_rankings FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_location_rankings_updated_at ON public.location_rankings;
CREATE TRIGGER update_location_rankings_updated_at
BEFORE UPDATE ON public.location_rankings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_rankings_location_id ON public.location_rankings(location_id);
CREATE INDEX IF NOT EXISTS idx_location_rankings_created_at ON public.location_rankings(created_at DESC);