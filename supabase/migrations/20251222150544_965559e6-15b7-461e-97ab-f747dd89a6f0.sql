-- Enable realtime payload completeness for comment/share tables
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.post_shares REPLICA IDENTITY FULL;