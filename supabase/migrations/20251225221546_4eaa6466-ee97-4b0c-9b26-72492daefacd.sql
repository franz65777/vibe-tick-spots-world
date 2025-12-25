-- Update follow request notification trigger to also notify when a previously declined/accepted request is re-opened (status -> pending)

CREATE OR REPLACE FUNCTION public.handle_follow_request_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_username text;
  requester_avatar text;
  recipient_lang text;
  notif_title text;
  notif_message text;
  expires_at_ts timestamptz;
BEGIN
  expires_at_ts := now() + interval '30 days';

  -- INSERT: create notification only for pending requests
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN
      RETURN NEW;
    END IF;

    SELECT p.username, p.avatar_url
      INTO requester_username, requester_avatar
    FROM public.profiles p
    WHERE p.id = NEW.requester_id;

    SELECT p.language
      INTO recipient_lang
    FROM public.profiles p
    WHERE p.id = NEW.requested_id;

    IF recipient_lang = 'it' THEN
      notif_title := 'Richiesta di follow';
      notif_message := coalesce(requester_username, 'Qualcuno') || ' vuole seguirti';
    ELSE
      notif_title := 'Follow Request';
      notif_message := coalesce(requester_username, 'Someone') || ' wants to follow you';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, data, is_read, expires_at)
    VALUES (
      NEW.requested_id,
      'follow_request',
      notif_title,
      notif_message,
      jsonb_build_object(
        'user_id', NEW.requester_id,
        'user_name', requester_username,
        'avatar_url', requester_avatar,
        'request_id', NEW.id,
        'status', NEW.status
      ),
      false,
      expires_at_ts
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Re-opened request (e.g. declined -> pending): create a NEW notification so it shows again
    IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
      SELECT p.username, p.avatar_url
        INTO requester_username, requester_avatar
      FROM public.profiles p
      WHERE p.id = NEW.requester_id;

      SELECT p.language
        INTO recipient_lang
      FROM public.profiles p
      WHERE p.id = NEW.requested_id;

      IF recipient_lang = 'it' THEN
        notif_title := 'Richiesta di follow';
        notif_message := coalesce(requester_username, 'Qualcuno') || ' vuole seguirti';
      ELSE
        notif_title := 'Follow Request';
        notif_message := coalesce(requester_username, 'Someone') || ' wants to follow you';
      END IF;

      INSERT INTO public.notifications (user_id, type, title, message, data, is_read, expires_at)
      VALUES (
        NEW.requested_id,
        'follow_request',
        notif_title,
        notif_message,
        jsonb_build_object(
          'user_id', NEW.requester_id,
          'user_name', requester_username,
          'avatar_url', requester_avatar,
          'request_id', NEW.id,
          'status', NEW.status
        ),
        false,
        expires_at_ts
      );

      RETURN NEW;
    END IF;

    -- When request is handled, expire its notifications
    IF NEW.status IN ('accepted', 'declined') AND OLD.status = 'pending' THEN
      UPDATE public.notifications
      SET expires_at = now()
      WHERE user_id = NEW.requested_id
        AND type = 'follow_request'
        AND (data->>'request_id') = NEW.id::text;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;