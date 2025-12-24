-- Prevent duplicate follow_request notifications for the same requester->requested pair
-- by automatically deleting older pending ones when a new one arrives

CREATE OR REPLACE FUNCTION public.dedupe_follow_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act on follow_request type notifications
  IF NEW.type = 'follow_request' THEN
    -- Delete any older pending follow_request notifications for the same user_id (recipient)
    -- coming from the same requester (stored in data->>'user_id')
    DELETE FROM public.notifications
    WHERE id != NEW.id
      AND user_id = NEW.user_id
      AND type = 'follow_request'
      AND (data->>'user_id') = (NEW.data->>'user_id')
      AND expires_at > now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after insert
DROP TRIGGER IF EXISTS dedupe_follow_request_notification_trigger ON public.notifications;

CREATE TRIGGER dedupe_follow_request_notification_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.dedupe_follow_request_notification();