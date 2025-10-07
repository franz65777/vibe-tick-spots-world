-- Ensure posts interaction counters exist and are consistent
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='posts' AND column_name='likes_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN likes_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='posts' AND column_name='saves_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN saves_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='posts' AND column_name='comments_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN comments_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='posts' AND column_name='shares_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN shares_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create post_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  shared_via text,
  share_target text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_shares' AND policyname='Users can manage their own post shares'
  ) THEN
    CREATE POLICY "Users can manage their own post shares" ON public.post_shares
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_shares' AND policyname='Users can view all post shares'
  ) THEN
    CREATE POLICY "Users can view all post shares" ON public.post_shares FOR SELECT USING (true);
  END IF;
END $$;

-- Function to update shares_count
CREATE OR REPLACE FUNCTION public.update_post_shares_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Ensure triggers exist for shares
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_shares_count_ins'
  ) THEN
    CREATE TRIGGER trg_update_post_shares_count_ins
    AFTER INSERT ON public.post_shares
    FOR EACH ROW EXECUTE FUNCTION public.update_post_shares_count();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_shares_count_del'
  ) THEN
    CREATE TRIGGER trg_update_post_shares_count_del
    AFTER DELETE ON public.post_shares
    FOR EACH ROW EXECUTE FUNCTION public.update_post_shares_count();
  END IF;
END $$;

-- Also ensure triggers exist for likes/saves/comments using already-defined functions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_likes_count_ins'
  ) THEN
    CREATE TRIGGER trg_update_post_likes_count_ins
    AFTER INSERT ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_likes_count_del'
  ) THEN
    CREATE TRIGGER trg_update_post_likes_count_del
    AFTER DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_saves_count_ins'
  ) THEN
    CREATE TRIGGER trg_update_post_saves_count_ins
    AFTER INSERT ON public.post_saves
    FOR EACH ROW EXECUTE FUNCTION public.update_post_saves_count();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_saves_count_del'
  ) THEN
    CREATE TRIGGER trg_update_post_saves_count_del
    AFTER DELETE ON public.post_saves
    FOR EACH ROW EXECUTE FUNCTION public.update_post_saves_count();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_comments_count_ins'
  ) THEN
    CREATE TRIGGER trg_update_post_comments_count_ins
    AFTER INSERT ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_post_comments_count_del'
  ) THEN
    CREATE TRIGGER trg_update_post_comments_count_del
    AFTER DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();
  END IF;
END $$;
