-- Create marketing campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  business_user_id UUID NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('event', 'discount', 'promotion', 'news')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active marketing campaigns"
  ON public.marketing_campaigns
  FOR SELECT
  USING (is_active = true AND end_date > now());

CREATE POLICY "Business owners can create campaigns for their locations"
  ON public.marketing_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.locations
      WHERE locations.id = marketing_campaigns.location_id
      AND locations.claimed_by = auth.uid()
    )
    AND business_user_id = auth.uid()
  );

CREATE POLICY "Business owners can update their own campaigns"
  ON public.marketing_campaigns
  FOR UPDATE
  USING (business_user_id = auth.uid())
  WITH CHECK (business_user_id = auth.uid());

CREATE POLICY "Business owners can delete their own campaigns"
  ON public.marketing_campaigns
  FOR DELETE
  USING (business_user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_marketing_campaigns_location_id ON public.marketing_campaigns(location_id);
CREATE INDEX idx_marketing_campaigns_active ON public.marketing_campaigns(is_active, end_date);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_campaigns_updated_at();