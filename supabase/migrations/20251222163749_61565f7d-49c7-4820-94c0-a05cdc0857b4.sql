-- Allow authenticated users to create social notifications (like/comment/follow/post_share)
-- while ensuring the actor is always the current user via data.user_id.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create social notifications" ON public.notifications;

CREATE POLICY "Users can create social notifications"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid())
  AND (data ? 'user_id')
  AND ((data->>'user_id')::uuid = auth.uid())
  AND type IN ('like','comment','follow','post_share')
);

-- Keep existing policies as-is (view/update, and location_share insert policy already exists).