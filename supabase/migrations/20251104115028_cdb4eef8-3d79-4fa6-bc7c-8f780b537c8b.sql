-- Create storage bucket for location cover images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('location-images', 'location-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;