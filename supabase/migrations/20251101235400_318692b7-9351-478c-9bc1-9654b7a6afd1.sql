-- Allow users to delete their own sent messages
CREATE POLICY "Users can delete their own sent messages"
ON public.direct_messages FOR DELETE
USING (auth.uid() = sender_id);