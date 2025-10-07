-- Create user_mutes table for per-user notification silencing
CREATE TABLE IF NOT EXISTS public.user_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id UUID NOT NULL,
  muted_user_id UUID NOT NULL,
  is_muted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_mutes_unique_pair UNIQUE (muter_id, muted_user_id)
);

-- Enable RLS
ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_mutes' AND policyname = 'Users can insert their own mutes'
  ) THEN
    CREATE POLICY "Users can insert their own mutes"
    ON public.user_mutes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = muter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_mutes' AND policyname = 'Users can update their own mutes'
  ) THEN
    CREATE POLICY "Users can update their own mutes"
    ON public.user_mutes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = muter_id)
    WITH CHECK (auth.uid() = muter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_mutes' AND policyname = 'Users can delete their own mutes'
  ) THEN
    CREATE POLICY "Users can delete their own mutes"
    ON public.user_mutes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = muter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_mutes' AND policyname = 'Users can view their own mutes'
  ) THEN
    CREATE POLICY "Users can view their own mutes"
    ON public.user_mutes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = muter_id);
  END IF;
END $$;

-- Update timestamp trigger function (safe to replace)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_mutes_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_mutes_updated_at
    BEFORE UPDATE ON public.user_mutes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Ensure direct_messages trigger exists to maintain message_threads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_thread_last_message'
  ) THEN
    CREATE TRIGGER trg_update_thread_last_message
    AFTER INSERT ON public.direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_thread_last_message();
  END IF;
END $$;