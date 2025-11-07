-- Add content_type column to posts table for marketing content
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_type TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN posts.content_type IS 'Type of marketing content: event, discount, promotion, announcement';

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_posts_content_type ON posts(content_type) WHERE content_type IS NOT NULL;