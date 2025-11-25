import { supabase } from '@/integrations/supabase/client';
import i18next from 'i18next';

// Notification translation keys for all supported languages
const notificationTranslations = {
  en: {
    friend_accepted_title: 'Friend Request Accepted',
    friend_accepted_message: 'Your friend request has been accepted!',
    new_follower_title: 'New follower',
    new_follower_message: '{{username}} started following you',
  },
  it: {
    friend_accepted_title: 'Richiesta di amicizia accettata',
    friend_accepted_message: 'La tua richiesta di amicizia è stata accettata!',
    new_follower_title: 'Nuovo follower',
    new_follower_message: '{{username}} ha iniziato a seguirti',
  },
  es: {
    friend_accepted_title: 'Solicitud de amistad aceptada',
    friend_accepted_message: '¡Tu solicitud de amistad ha sido aceptada!',
    new_follower_title: 'Nuevo seguidor',
    new_follower_message: '{{username}} comenzó a seguirte',
  },
  fr: {
    friend_accepted_title: 'Demande d\'ami acceptée',
    friend_accepted_message: 'Votre demande d\'ami a été acceptée!',
    new_follower_title: 'Nouvel abonné',
    new_follower_message: '{{username}} a commencé à vous suivre',
  },
  de: {
    friend_accepted_title: 'Freundschaftsanfrage akzeptiert',
    friend_accepted_message: 'Deine Freundschaftsanfrage wurde akzeptiert!',
    new_follower_title: 'Neuer Follower',
    new_follower_message: '{{username}} folgt dir jetzt',
  },
  pt: {
    friend_accepted_title: 'Solicitação de amizade aceita',
    friend_accepted_message: 'Sua solicitação de amizade foi aceita!',
    new_follower_title: 'Novo seguidor',
    new_follower_message: '{{username}} começou a seguir você',
  },
  ru: {
    friend_accepted_title: 'Запрос в друзья принят',
    friend_accepted_message: 'Ваш запрос в друзья был принят!',
    new_follower_title: 'Новый подписчик',
    new_follower_message: '{{username}} начал следить за вами',
  },
  'zh-CN': {
    friend_accepted_title: '好友请求已接受',
    friend_accepted_message: '您的好友请求已被接受！',
    new_follower_title: '新粉丝',
    new_follower_message: '{{username}} 开始关注你了',
  },
  ja: {
    friend_accepted_title: '友達リクエストが承認されました',
    friend_accepted_message: 'あなたの友達リクエストが承認されました！',
    new_follower_title: '新しいフォロワー',
    new_follower_message: '{{username}}があなたをフォローし始めました',
  },
  ar: {
    friend_accepted_title: 'تم قبول طلب الصداقة',
    friend_accepted_message: 'تم قبول طلب الصداقة الخاص بك!',
    new_follower_title: 'متابع جديد',
    new_follower_message: '{{username}} بدأ بمتابعتك',
  },
  ko: {
    friend_accepted_title: '친구 요청이 수락되었습니다',
    friend_accepted_message: '친구 요청이 수락되었습니다!',
    new_follower_title: '새 팔로워',
    new_follower_message: '{{username}}님이 회원님을 팔로우하기 시작했습니다',
  },
  tr: {
    friend_accepted_title: 'Arkadaşlık isteği kabul edildi',
    friend_accepted_message: 'Arkadaşlık isteğin kabul edildi!',
    new_follower_title: 'Yeni takipçi',
    new_follower_message: '{{username}} seni takip etmeye başladı',
  },
};

/**
 * Get localized notification text based on user's language preference
 */
async function getLocalizedNotificationText(
  userId: string,
  notificationType: 'friend_accepted' | 'new_follower',
  params: Record<string, string> = {}
): Promise<{ title: string; message: string }> {
  try {
    // Fetch user's language preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .single();

    // Normalize language code
    let lang = profile?.language || 'en';
    if (lang === 'zh') lang = 'zh-CN';
    
    // Get translations for the user's language, fallback to English
    const translations = notificationTranslations[lang as keyof typeof notificationTranslations] || notificationTranslations.en;
    
    // Get title and message
    let title = translations[`${notificationType}_title` as keyof typeof translations] || '';
    let message = translations[`${notificationType}_message` as keyof typeof translations] || '';
    
    // Replace parameters (e.g., {{username}})
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{{${key}}}`, value);
    });
    
    return { title, message };
  } catch (error) {
    console.error('Error getting localized notification text:', error);
    // Fallback to English
    const translations = notificationTranslations.en;
    let title = translations[`${notificationType}_title` as keyof typeof translations] || '';
    let message = translations[`${notificationType}_message` as keyof typeof translations] || '';
    
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{{${key}}}`, value);
    });
    
    return { title, message };
  }
}

/**
 * Send a localized notification to a user
 */
export async function sendLocalizedNotification(
  userId: string,
  notificationType: 'friend_accepted' | 'new_follower',
  data: Record<string, any> = {},
  params: Record<string, string> = {}
): Promise<void> {
  const { title, message } = await getLocalizedNotificationText(userId, notificationType, params);
  
  await supabase.from('notifications').insert({
    user_id: userId,
    type: notificationType,
    title,
    message,
    data,
  });
}
