-- Ensure counts stay in sync when users interact with posts
-- 1) Function to maintain comments_count on posts
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2) Create triggers if they do not already exist
DO $$
BEGIN
  -- Likes triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_post_likes_count_ins') THEN
    CREATE TRIGGER trg_post_likes_count_ins
    AFTER INSERT ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_post_likes_count_del') THEN
    CREATE TRIGGER trg_post_likes_count_del
    AFTER DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
  END IF;

  -- Saves triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_post_saves_count_ins') THEN
    CREATE TRIGGER trg_post_saves_count_ins
    AFTER INSERT ON public.post_saves
    FOR EACH ROW EXECUTE FUNCTION public.update_post_saves_count();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_post_saves_count_del') THEN
    CREATE TRIGGER trg_post_saves_count_del
    AFTER DELETE ON public.post_saves
    FOR EACH ROW EXECUTE FUNCTION public.update_post_saves_count();
  END IF;

  -- Comments triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_post_comments_count_ins') THEN
    CREATE TRIGGER trg_post_comments_count_ins
    AFTER INSERT ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_post_comments_count_del') THEN
    CREATE TRIGGER trg_post_comments_count_del
    AFTER DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();
  END IF;
END$$;

-- 3) Helpful indexes for performance (no-ops if they already exist)
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_post_id ON public.post_saves(post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_user_id ON public.post_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);