-- Add username change tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username_changes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_username_change_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create a table to track username change history
CREATE TABLE IF NOT EXISTS username_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_username TEXT NOT NULL,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS on username_changes table
ALTER TABLE username_changes ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own username change history
CREATE POLICY "Users can view their own username changes"
ON username_changes
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own username changes
CREATE POLICY "Users can insert their own username changes"
ON username_changes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_username_changes_user_id ON username_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_username_changes_changed_at ON username_changes(changed_at);