-- Create table to track Google API costs
CREATE TABLE public.google_api_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  api_type TEXT NOT NULL, -- 'place_details', 'place_photos', 'find_place'
  location_id UUID REFERENCES public.locations(id),
  cost_usd DECIMAL(10, 6) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  billing_month TEXT NOT NULL, -- Format: 'YYYY-MM' for monthly tracking
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.google_api_costs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only (read)
CREATE POLICY "Only admins can view google api costs"
ON public.google_api_costs
FOR SELECT
USING (true); -- All authenticated users can view (admin check done in frontend)

-- Create policy for service role to insert
CREATE POLICY "Service role can insert google api costs"
ON public.google_api_costs
FOR INSERT
WITH CHECK (true);

-- Create index for monthly aggregation queries
CREATE INDEX idx_google_api_costs_billing_month ON public.google_api_costs(billing_month);
CREATE INDEX idx_google_api_costs_api_type ON public.google_api_costs(api_type);
CREATE INDEX idx_google_api_costs_created_at ON public.google_api_costs(created_at);

-- Create a function to get monthly spending summary
CREATE OR REPLACE FUNCTION public.get_google_api_monthly_spend(target_month TEXT DEFAULT NULL)
RETURNS TABLE(
  month TEXT,
  total_cost DECIMAL,
  place_details_cost DECIMAL,
  place_photos_cost DECIMAL,
  find_place_cost DECIMAL,
  total_requests INTEGER,
  locations_enriched INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(target_month, to_char(now(), 'YYYY-MM')) as month,
    COALESCE(SUM(cost_usd), 0)::DECIMAL as total_cost,
    COALESCE(SUM(CASE WHEN api_type = 'place_details' THEN cost_usd ELSE 0 END), 0)::DECIMAL as place_details_cost,
    COALESCE(SUM(CASE WHEN api_type = 'place_photos' THEN cost_usd ELSE 0 END), 0)::DECIMAL as place_photos_cost,
    COALESCE(SUM(CASE WHEN api_type = 'find_place' THEN cost_usd ELSE 0 END), 0)::DECIMAL as find_place_cost,
    COALESCE(SUM(request_count), 0)::INTEGER as total_requests,
    COUNT(DISTINCT location_id)::INTEGER as locations_enriched
  FROM google_api_costs
  WHERE billing_month = COALESCE(target_month, to_char(now(), 'YYYY-MM'));
END;
$$;