-- Add api_key_identifier column to track which API key is used
ALTER TABLE public.google_api_costs 
ADD COLUMN IF NOT EXISTS api_key_identifier TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.google_api_costs.api_key_identifier IS 'Partial identifier of the API key used (last 6 chars for security)';