-- Create storage bucket for business documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for business documents
CREATE POLICY "Anyone can view business documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-documents');

CREATE POLICY "Authenticated users can upload business documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-documents' 
  AND auth.role() = 'authenticated'
);