-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all saved places" ON public.saved_places;

-- Create a more restrictive policy: users can see their own + followed users' places
CREATE POLICY "Users can view own and followed users places" 
ON public.saved_places 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = auth.uid() 
    AND following_id = saved_places.user_id
  )
);