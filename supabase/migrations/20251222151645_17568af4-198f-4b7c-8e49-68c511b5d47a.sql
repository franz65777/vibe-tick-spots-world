-- Enable realtime for post shares (and likes for completeness)
ALTER TABLE public.post_shares REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;