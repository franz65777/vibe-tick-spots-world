-- 1) Make handle_friend_request_accepted create localized friend_accepted notifications with avatar/username
-- 2) Keep follow_request notifications in handle_follow_request_notifications (remove duplicate friend_accepted creation)

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

    -- Localized follow request title and message (12 languages)
    CASE recipient_lang
      WHEN 'it' THEN notif_title := 'Richiesta di follow'; notif_message := coalesce(requester_username, 'Qualcuno') || ' vuole seguirti';
      WHEN 'es' THEN notif_title := 'Solicitud de seguimiento'; notif_message := coalesce(requester_username, 'Alguien') || ' quiere seguirte';
      WHEN 'fr' THEN notif_title := 'Demande de suivi'; notif_message := coalesce(requester_username, 'Quelqu''un') || ' veut vous suivre';
      WHEN 'de' THEN notif_title := 'Folgeanfrage'; notif_message := coalesce(requester_username, 'Jemand') || ' möchte dir folgen';
      WHEN 'pt' THEN notif_title := 'Solicitação de seguir'; notif_message := coalesce(requester_username, 'Alguém') || ' quer seguir você';
      WHEN 'ru' THEN notif_title := 'Запрос на подписку'; notif_message := coalesce(requester_username, 'Кто-то') || ' хочет подписаться на вас';
      WHEN 'zh' THEN notif_title := '关注请求'; notif_message := coalesce(requester_username, '有人') || ' 想要关注你';
      WHEN 'zh-CN' THEN notif_title := '关注请求'; notif_message := coalesce(requester_username, '有人') || ' 想要关注你';
      WHEN 'ja' THEN notif_title := 'フォローリクエスト'; notif_message := coalesce(requester_username, '誰か') || 'があなたをフォローしたいです';
      WHEN 'ar' THEN notif_title := 'طلب متابعة'; notif_message := coalesce(requester_username, 'شخص ما') || ' يريد متابعتك';
      WHEN 'ko' THEN notif_title := '팔로우 요청'; notif_message := coalesce(requester_username, '누군가') || '님이 회원님을 팔로우하고 싶어합니다';
      WHEN 'tr' THEN notif_title := 'Takip isteği'; notif_message := coalesce(requester_username, 'Biri') || ' seni takip etmek istiyor';
      ELSE notif_title := 'Follow Request'; notif_message := coalesce(requester_username, 'Someone') || ' wants to follow you';
    END CASE;

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
    -- Re-opened request: create a NEW follow_request notification
    IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
      SELECT p.username, p.avatar_url
        INTO requester_username, requester_avatar
      FROM public.profiles p
      WHERE p.id = NEW.requester_id;

      SELECT p.language
        INTO recipient_lang
      FROM public.profiles p
      WHERE p.id = NEW.requested_id;

      CASE recipient_lang
        WHEN 'it' THEN notif_title := 'Richiesta di follow'; notif_message := coalesce(requester_username, 'Qualcuno') || ' vuole seguirti';
        WHEN 'es' THEN notif_title := 'Solicitud de seguimiento'; notif_message := coalesce(requester_username, 'Alguien') || ' quiere seguirte';
        WHEN 'fr' THEN notif_title := 'Demande de suivi'; notif_message := coalesce(requester_username, 'Quelqu''un') || ' veut vous suivre';
        WHEN 'de' THEN notif_title := 'Folgeanfrage'; notif_message := coalesce(requester_username, 'Jemand') || ' möchte dir folgen';
        WHEN 'pt' THEN notif_title := 'Solicitação de seguir'; notif_message := coalesce(requester_username, 'Alguém') || ' quer seguir você';
        WHEN 'ru' THEN notif_title := 'Запрос на подписку'; notif_message := coalesce(requester_username, 'Кто-то') || ' хочет подписаться на вас';
        WHEN 'zh' THEN notif_title := '关注请求'; notif_message := coalesce(requester_username, '有人') || ' 想要关注你';
        WHEN 'zh-CN' THEN notif_title := '关注请求'; notif_message := coalesce(requester_username, '有人') || ' 想要关注你';
        WHEN 'ja' THEN notif_title := 'フォローリクエスト'; notif_message := coalesce(requester_username, '誰か') || 'があなたをフォローしたいです';
        WHEN 'ar' THEN notif_title := 'طلب متابعة'; notif_message := coalesce(requester_username, 'شخص ما') || ' يريد متابعتك';
        WHEN 'ko' THEN notif_title := '팔로우 요청'; notif_message := coalesce(requester_username, '누군가') || '님이 회원님을 팔로우하고 싶어합니다';
        WHEN 'tr' THEN notif_title := 'Takip isteği'; notif_message := coalesce(requester_username, 'Biri') || ' seni takip etmek istiyor';
        ELSE notif_title := 'Follow Request'; notif_message := coalesce(requester_username, 'Someone') || ' wants to follow you';
      END CASE;

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

    -- When request is handled, expire its follow_request notifications
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

CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_lang text;
  acceptor_username text;
  acceptor_avatar text;
  notif_title text;
  notif_message text;
  expires_at_ts timestamptz;
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    expires_at_ts := now() + interval '30 days';

    -- Add mutual follow relationship
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.requested_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requested_id, NEW.requester_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    -- Acceptor (the user who accepted) profile
    SELECT p.username, p.avatar_url
      INTO acceptor_username, acceptor_avatar
    FROM public.profiles p
    WHERE p.id = NEW.requested_id;

    -- Requester's language
    SELECT p.language
      INTO requester_lang
    FROM public.profiles p
    WHERE p.id = NEW.requester_id;

    -- Localized title/message with username (12 languages)
    CASE requester_lang
      WHEN 'it' THEN notif_title := 'Richiesta accettata'; notif_message := coalesce(acceptor_username, 'Qualcuno') || ' ha accettato la tua richiesta';
      WHEN 'es' THEN notif_title := 'Solicitud aceptada'; notif_message := coalesce(acceptor_username, 'Alguien') || ' ha aceptado tu solicitud';
      WHEN 'fr' THEN notif_title := 'Demande acceptée'; notif_message := coalesce(acceptor_username, 'Quelqu''un') || ' a accepté votre demande';
      WHEN 'de' THEN notif_title := 'Anfrage akzeptiert'; notif_message := coalesce(acceptor_username, 'Jemand') || ' hat deine Anfrage akzeptiert';
      WHEN 'pt' THEN notif_title := 'Solicitação aceita'; notif_message := coalesce(acceptor_username, 'Alguém') || ' aceitou sua solicitação';
      WHEN 'ru' THEN notif_title := 'Запрос принят'; notif_message := coalesce(acceptor_username, 'Кто-то') || ' принял ваш запрос';
      WHEN 'zh' THEN notif_title := '请求已接受'; notif_message := coalesce(acceptor_username, '有人') || ' 接受了你的请求';
      WHEN 'zh-CN' THEN notif_title := '请求已接受'; notif_message := coalesce(acceptor_username, '有人') || ' 接受了你的请求';
      WHEN 'ja' THEN notif_title := 'リクエストが承認されました'; notif_message := coalesce(acceptor_username, '誰か') || 'があなたのリクエストを承認しました';
      WHEN 'ar' THEN notif_title := 'تم قبول الطلب'; notif_message := coalesce(acceptor_username, 'شخص ما') || ' قبل طلبك';
      WHEN 'ko' THEN notif_title := '요청 수락됨'; notif_message := coalesce(acceptor_username, '누군가') || '님이 회원님의 요청을 수락했습니다';
      WHEN 'tr' THEN notif_title := 'İstek kabul edildi'; notif_message := coalesce(acceptor_username, 'Biri') || ' isteğini kabul etti';
      ELSE notif_title := 'Request Accepted'; notif_message := coalesce(acceptor_username, 'Someone') || ' accepted your request';
    END CASE;

    -- Create notification for the requester (include acceptor id + username + avatar)
    INSERT INTO public.notifications (user_id, type, title, message, data, is_read, expires_at)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      notif_title,
      notif_message,
      jsonb_build_object(
        'user_id', NEW.requested_id,
        'user_name', acceptor_username,
        'avatar_url', acceptor_avatar,
        'request_id', NEW.id
      ),
      false,
      expires_at_ts
    );
  END IF;

  RETURN NEW;
END;
$$;