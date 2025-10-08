-- Add optional rating field to posts table for post reviews
ALTER TABLE public.posts ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 10);

-- Add comment to explain the field
COMMENT ON COLUMN public.posts.rating IS 'Optional 1-10 rating when creating a post about a location';

-- Create index for posts with ratings
CREATE INDEX idx_posts_rating ON public.posts(rating) WHERE rating IS NOT NULL;