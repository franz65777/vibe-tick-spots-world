-- Enable REPLICA IDENTITY FULL for realtime to capture all row data on updates
ALTER TABLE public.user_saved_locations REPLICA IDENTITY FULL;
ALTER TABLE public.saved_places REPLICA IDENTITY FULL;