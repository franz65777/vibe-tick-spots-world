-- Add onboarding_completed field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Update existing users to have onboarding completed (so they don't see it)
UPDATE profiles 
SET onboarding_completed = true 
WHERE onboarding_completed IS NULL;