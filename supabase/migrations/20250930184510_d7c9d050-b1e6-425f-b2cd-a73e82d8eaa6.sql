-- Add claimed_by column to locations table
ALTER TABLE public.locations
ADD COLUMN claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_locations_claimed_by ON public.locations(claimed_by);

-- Create RLS policy for claimed locations
CREATE POLICY "Users can claim locations"
ON public.locations
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (claimed_by = auth.uid() OR claimed_by IS NULL);