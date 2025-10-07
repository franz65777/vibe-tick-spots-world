-- Normalize existing null counts and set defaults
UPDATE public.posts SET likes_count = 0 WHERE likes_count IS NULL;
UPDATE public.posts SET comments_count = 0 WHERE comments_count IS NULL;
UPDATE public.posts SET saves_count = 0 WHERE saves_count IS NULL;

ALTER TABLE public.posts ALTER COLUMN likes_count SET DEFAULT 0;
ALTER TABLE public.posts ALTER COLUMN comments_count SET DEFAULT 0;
ALTER TABLE public.posts ALTER COLUMN saves_count SET DEFAULT 0;

-- Engagement count triggers
DROP TRIGGER IF EXISTS post_likes_count_trigger ON public.post_likes;
CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

DROP TRIGGER IF EXISTS post_saves_count_trigger ON public.post_saves;
CREATE TRIGGER post_saves_count_trigger
AFTER INSERT OR DELETE ON public.post_saves
FOR EACH ROW EXECUTE FUNCTION public.update_post_saves_count();

DROP TRIGGER IF EXISTS post_comments_count_trigger ON public.post_comments;
CREATE TRIGGER post_comments_count_trigger
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Notifications on likes
DROP TRIGGER IF EXISTS notify_post_liked_trigger ON public.post_likes;
CREATE TRIGGER notify_post_liked_trigger
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_post_liked();

-- Keep profiles.posts_count in sync
DROP TRIGGER IF EXISTS posts_count_insert ON public.posts;
CREATE TRIGGER posts_count_insert
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_posts_count_on_insert();

DROP TRIGGER IF EXISTS posts_count_delete ON public.posts;
CREATE TRIGGER posts_count_delete
AFTER DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_posts_count_on_delete();

-- Ensure a location row exists for saved Google place IDs
DROP TRIGGER IF EXISTS ensure_location_for_saved_place_trg ON public.saved_places;
CREATE TRIGGER ensure_location_for_saved_place_trg
BEFORE INSERT ON public.saved_places
FOR EACH ROW EXECUTE FUNCTION public.ensure_location_for_saved_place();

-- Messaging thread maintenance
DROP TRIGGER IF EXISTS update_thread_last_message_trg ON public.direct_messages;
CREATE TRIGGER update_thread_last_message_trg
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.update_thread_last_message();

-- Follow notifications
DROP TRIGGER IF EXISTS notify_follow_created_trg ON public.follows;
CREATE TRIGGER notify_follow_created_trg
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_follow_created();

-- Post shares RLS and defaults
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_shares' AND policyname = 'Users can manage their own post shares'
  ) THEN
    CREATE POLICY "Users can manage their own post shares"
    ON public.post_shares
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_shares' AND policyname = 'Users can view all post shares'
  ) THEN
    CREATE POLICY "Users can view all post shares"
    ON public.post_shares
    FOR SELECT
    USING (true);
  END IF;
END$$;

ALTER TABLE public.post_shares ALTER COLUMN shared_at SET DEFAULT now();