-- Create business claim requests table
CREATE TABLE IF NOT EXISTS public.business_claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  description TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business subscriptions table
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_request_id UUID REFERENCES public.business_claim_requests(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'yearly')),
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_claim_requests
CREATE POLICY "Users can create their own claim requests"
  ON public.business_claim_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own claim requests"
  ON public.business_claim_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all claim requests"
  ON public.business_claim_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.username = 'FraTrinky'
    )
  );

CREATE POLICY "Admin can update claim requests"
  ON public.business_claim_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.username = 'FraTrinky'
    )
  );

-- RLS Policies for business_subscriptions
CREATE POLICY "Users can create their own subscriptions"
  ON public.business_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions"
  ON public.business_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.business_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_business_claim_requests_user_id ON public.business_claim_requests(user_id);
CREATE INDEX idx_business_claim_requests_status ON public.business_claim_requests(status);
CREATE INDEX idx_business_subscriptions_user_id ON public.business_subscriptions(user_id);
CREATE INDEX idx_business_subscriptions_status ON public.business_subscriptions(status);