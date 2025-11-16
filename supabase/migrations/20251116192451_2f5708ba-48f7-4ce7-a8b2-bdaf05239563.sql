-- Add save_tag column to user_saved_locations table
ALTER TABLE public.user_saved_locations
ADD COLUMN save_tag text DEFAULT 'general' NOT NULL;

-- Add save_tag column to saved_places table
ALTER TABLE public.saved_places
ADD COLUMN save_tag text DEFAULT 'general' NOT NULL;

-- Create index for faster filtering by tag
CREATE INDEX idx_user_saved_locations_save_tag ON public.user_saved_locations(save_tag);
CREATE INDEX idx_saved_places_save_tag ON public.saved_places(save_tag);

-- Update all existing records to have 'general' tag (safety measure)
UPDATE public.user_saved_locations SET save_tag = 'general' WHERE save_tag IS NULL;
UPDATE public.saved_places SET save_tag = 'general' WHERE save_tag IS NULL;