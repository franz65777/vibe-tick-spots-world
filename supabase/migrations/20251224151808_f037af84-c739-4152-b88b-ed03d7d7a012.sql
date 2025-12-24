-- Create user privacy settings table
CREATE TABLE public.user_privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  been_cards_visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (been_cards_visibility IN ('everyone', 'none', 'close_friends', 'followers')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own privacy settings
CREATE POLICY "Users can view their own privacy settings"
ON public.user_privacy_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own privacy settings
CREATE POLICY "Users can insert their own privacy settings"
ON public.user_privacy_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update their own privacy settings"
ON public.user_privacy_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow other users to check privacy status (for visibility checks)
CREATE POLICY "Anyone can check if a user is private"
ON public.user_privacy_settings
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_user_privacy_settings_user_id ON public.user_privacy_settings(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_privacy_settings_updated_at
BEFORE UPDATE ON public.user_privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();