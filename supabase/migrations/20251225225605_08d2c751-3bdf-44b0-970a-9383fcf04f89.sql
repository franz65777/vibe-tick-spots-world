-- Enable DELETE for notifications (required for swipe-to-delete)
-- Table already has RLS enabled; add missing DELETE policy.

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);
