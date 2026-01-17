-- Create app_settings table for configurable budget limits and kill switches
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (needed by edge functions)
CREATE POLICY "Anyone can read app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Only authenticated users can update (admin should verify in app)
CREATE POLICY "Authenticated users can update app settings" 
ON public.app_settings 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default settings: Google API disabled by default, $10 limit
INSERT INTO public.app_settings (key, value) VALUES
  ('google_api_budget', '{"monthly_limit_usd": 10, "enabled": false}'::jsonb)
ON CONFLICT (key) DO UPDATE SET 
  value = '{"monthly_limit_usd": 10, "enabled": false}'::jsonb,
  updated_at = NOW();