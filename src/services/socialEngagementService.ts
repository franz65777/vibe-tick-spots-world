import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Unified Social Engagement Service
 * Handles likes, comments, shares across posts with proper notifications
 */

type PostEngagementUpdateDetail = {
  postId: string;
  commentsDelta?: number;
  sharesDelta?: number;
};

function emitPostEngagementUpdate(detail: PostEngagementUpdateDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('post-engagement-updated', { detail }));
}

function toastSuccess(title: string, description?: string) {
  toast({ title, description });
}

function toastError(title: string, description?: string) {
  toast({ title, description, variant: 'destructive' });
}

function normalizeLanguage(lang: string | null | undefined): string {
  if (!lang) return 'en';
  // Accept 'it-IT', 'en-US', etc.
  const normalized = lang.toLowerCase().split('-')[0];
  return normalized || 'en';
}

const notificationTranslations: Record<string, Record<string, string>> = {
  en: {
    new_like_title: 'New like',
    new_like_message: '{{username}} liked your post',
    new_comment_title: 'New comment',
    new_comment_message: '{{username}} commented on your post',
    post_shared: 'Post shared with {{count}} {{people}}',
    person: 'person',
    people: 'people',
    post_saved: 'Post saved',
    post_unsaved: 'Post unsaved',
    share_failed: 'Failed to share post',
    save_failed: 'Failed to update save',
  },
  it: {
    new_like_title: 'Nuovo mi piace',
    new_like_message: '{{username}} ha messo mi piace al tuo post',
    new_comment_title: 'Nuovo commento',
    new_comment_message: '{{username}} ha commentato il tuo post',
    post_shared: 'Post condiviso con {{count}} {{people}}',
    person: 'persona',
    people: 'persone',
    post_saved: 'Post salvato',
    post_unsaved: 'Post rimosso dai salvati',
    share_failed: 'Impossibile condividere il post',
    save_failed: 'Impossibile aggiornare il salvataggio',
  },
  es: {
    new_like_title: 'Nuevo me gusta',
    new_like_message: '{{username}} le dio me gusta a tu publicación',
    new_comment_title: 'Nuevo comentario',
    new_comment_message: '{{username}} comentó en tu publicación',
    post_shared: 'Publicación compartida con {{count}} {{people}}',
    person: 'persona',
    people: 'personas',
    post_saved: 'Publicación guardada',
    post_unsaved: 'Publicación eliminada de guardados',
    share_failed: 'Error al compartir publicación',
    save_failed: 'Error al actualizar guardado',
  },
  fr: {
    new_like_title: 'Nouveau j\'aime',
    new_like_message: '{{username}} a aimé votre publication',
    new_comment_title: 'Nouveau commentaire',
    new_comment_message: '{{username}} a commenté votre publication',
    post_shared: 'Publication partagée avec {{count}} {{people}}',
    person: 'personne',
    people: 'personnes',
    post_saved: 'Publication enregistrée',
    post_unsaved: 'Publication retirée des enregistrements',
    share_failed: 'Échec du partage',
    save_failed: 'Échec de la mise à jour',
  },
  de: {
    new_like_title: 'Neues Like',
    new_like_message: '{{username}} gefällt dein Beitrag',
    new_comment_title: 'Neuer Kommentar',
    new_comment_message: '{{username}} hat deinen Beitrag kommentiert',
    post_shared: 'Beitrag mit {{count}} {{people}} geteilt',
    person: 'Person',
    people: 'Personen',
    post_saved: 'Beitrag gespeichert',
    post_unsaved: 'Beitrag aus Gespeicherten entfernt',
    share_failed: 'Fehler beim Teilen',
    save_failed: 'Fehler beim Speichern',
  },
  pt: {
    new_like_title: 'Nova curtida',
    new_like_message: '{{username}} curtiu sua publicação',
    new_comment_title: 'Novo comentário',
    new_comment_message: '{{username}} comentou na sua publicação',
    post_shared: 'Publicação compartilhada com {{count}} {{people}}',
    person: 'pessoa',
    people: 'pessoas',
    post_saved: 'Publicação salva',
    post_unsaved: 'Publicação removida dos salvos',
    share_failed: 'Falha ao compartilhar',
    save_failed: 'Falha ao atualizar',
  },
  zh: {
    new_like_title: '新点赞',
    new_like_message: '{{username}} 点赞了你的帖子',
    new_comment_title: '新评论',
    new_comment_message: '{{username}} 评论了你的帖子',
    post_shared: '帖子已分享给 {{count}} {{people}}',
    person: '人',
    people: '人',
    post_saved: '帖子已保存',
    post_unsaved: '帖子已取消保存',
    share_failed: '分享失败',
    save_failed: '保存失败',
  },
  ja: {
    new_like_title: '新しいいいね',
    new_like_message: '{{username}}があなたの投稿にいいねしました',
    new_comment_title: '新しいコメント',
    new_comment_message: '{{username}}があなたの投稿にコメントしました',
    post_shared: '{{count}}{{people}}に投稿を共有しました',
    person: '人',
    people: '人',
    post_saved: '投稿を保存しました',
    post_unsaved: '投稿の保存を解除しました',
    share_failed: '共有に失敗しました',
    save_failed: '保存の更新に失敗しました',
  },
  ko: {
    new_like_title: '새 좋아요',
    new_like_message: '{{username}}님이 게시물을 좋아합니다',
    new_comment_title: '새 댓글',
    new_comment_message: '{{username}}님이 댓글을 남겼습니다',
    post_shared: '{{count}}{{people}}에게 공유됨',
    person: '명',
    people: '명',
    post_saved: '게시물 저장됨',
    post_unsaved: '게시물 저장 취소됨',
    share_failed: '공유 실패',
    save_failed: '저장 업데이트 실패',
  },
  ar: {
    new_like_title: 'إعجاب جديد',
    new_like_message: '{{username}} أعجب بمنشورك',
    new_comment_title: 'تعليق جديد',
    new_comment_message: '{{username}} علق على منشورك',
    post_shared: 'تمت مشاركة المنشور مع {{count}} {{people}}',
    person: 'شخص',
    people: 'أشخاص',
    post_saved: 'تم حفظ المنشور',
    post_unsaved: 'تم إلغاء حفظ المنشور',
    share_failed: 'فشل المشاركة',
    save_failed: 'فشل تحديث الحفظ',
  },
  hi: {
    new_like_title: 'नई लाइक',
    new_like_message: '{{username}} ने आपकी पोस्ट को लाइक किया',
    new_comment_title: 'नई टिप्पणी',
    new_comment_message: '{{username}} ने आपकी पोस्ट पर टिप्पणी की',
    post_shared: 'पोस्ट {{count}} {{people}} के साथ साझा की गई',
    person: 'व्यक्ति',
    people: 'लोग',
    post_saved: 'पोस्ट सहेजी गई',
    post_unsaved: 'पोस्ट असहेजी गई',
    share_failed: 'साझा करने में विफल',
    save_failed: 'सहेजना अपडेट करने में विफल',
  },
  ru: {
    new_like_title: 'Новый лайк',
    new_like_message: '{{username}} понравилась ваша публикация',
    new_comment_title: 'Новый комментарий',
    new_comment_message: '{{username}} прокомментировал вашу публикацию',
    post_shared: 'Публикация отправлена {{count}} {{people}}',
    person: 'человеку',
    people: 'людям',
    post_saved: 'Публикация сохранена',
    post_unsaved: 'Публикация удалена из сохраненных',
    share_failed: 'Не удалось поделиться',
    save_failed: 'Не удалось обновить сохранение',
  },
  tr: {
    new_like_title: 'Yeni beğeni',
    new_like_message: '{{username}} gönderinizi beğendi',
    new_comment_title: 'Yeni yorum',
    new_comment_message: '{{username}} gönderinize yorum yaptı',
    post_shared: 'Gönderi {{count}} {{people}} ile paylaşıldı',
    person: 'kişi',
    people: 'kişi',
    post_saved: 'Gönderi kaydedildi',
    post_unsaved: 'Gönderi kaydedilmekten çıkarıldı',
    share_failed: 'Paylaşım başarısız',
    save_failed: 'Kaydetme güncellenemedi',
  },
};

// Helper to get user's language
async function getUserLanguage(userId: string): Promise<string> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .single();

    const lang = normalizeLanguage(profile?.language);
    // Keep compatibility with older stored values
    if (lang === 'zh') return 'zh';
    return lang;
  } catch {
    return 'en';
  }
}

// Helper to get translation
function getTranslation(lang: string, key: string): string {
  const translations = notificationTranslations[lang] || notificationTranslations.en;
  return translations[key] || notificationTranslations.en[key] || key;
}

// Helper function to get localized notification text
async function getLocalizedNotificationText(
  userId: string,
  type: 'new_like' | 'new_comment',
  username: string
): Promise<{ title: string; message: string }> {
  try {
    // Get user's language preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .single();

    const lang = normalizeLanguage(profile?.language);
    const translations = notificationTranslations[lang] || notificationTranslations.en;

    const title = translations[`${type}_title`] || notificationTranslations.en[`${type}_title`];
    let message = translations[`${type}_message`] || notificationTranslations.en[`${type}_message`];
    message = message.replace('{{username}}', username);

    return { title, message };
  } catch (error) {
    console.error('Error getting localized notification:', error);
    const translations = notificationTranslations.en;
    return {
      title: translations[`${type}_title`],
      message: translations[`${type}_message`].replace('{{username}}', username),
    };
  }
}

// ============= LIKES =============

export async function togglePostLike(postId: string, userId: string): Promise<boolean> {
  try {
    // Check if already liked
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existing.id);
      return false;
    } else {
      // Like
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId });
      
      if (error) throw error;

      // Get post owner for notification
      const { data: post } = await supabase
        .from('posts')
        .select('user_id, caption, media_urls, content_type')
        .eq('id', postId)
        .single();

      // Create notification if not own post
      if (post && post.user_id !== userId) {
        const { data: liker } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .single();

        // Get localized notification text
        const { title, message } = await getLocalizedNotificationText(
          post.user_id,
          'new_like',
          liker?.username || 'Someone'
        );

        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'like',
          title,
          message,
          data: {
            post_id: postId,
            user_id: userId,
            user_name: liker?.username,
            user_avatar: liker?.avatar_url,
            post_image: post.media_urls?.[0],
            content_type: post.content_type,
          },
        });
      }

      return true;
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    toastError('Failed to update like');
    return false;
  }
}

export interface PostLikeUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_followed: boolean;
}

export async function getPostLikes(postId: string): Promise<{ count: number; isLiked: boolean; userId: string | null }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    let isLiked = false;
    if (userId) {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();
      isLiked = !!data;
    }

    return { count: count || 0, isLiked, userId };
  } catch (error) {
    console.error('Error getting likes:', error);
    return { count: 0, isLiked: false, userId: null };
  }
}

export async function getPostLikesWithUsers(postId: string, currentUserId: string, limit: number = 3): Promise<PostLikeUser[]> {
  try {
    // Get all likes for this post with user profiles
    const { data: likes } = await supabase
      .from('post_likes')
      .select(`
        user_id,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!likes || likes.length === 0) return [];

    // Get current user's follows
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingIds = new Set(follows?.map(f => f.following_id) || []);

    // Map likes to PostLikeUser format
    const likeUsers = likes
      .map(like => {
        const profile = like.profiles as any;
        if (!profile) return null;
        
        return {
          user_id: like.user_id,
          username: profile.username || 'User',
          avatar_url: profile.avatar_url || null,
          is_followed: followingIds.has(like.user_id)
        };
      })
      .filter((u): u is PostLikeUser => u !== null);

    // Prioritize followed users, then others
    const followedUsers = likeUsers.filter(u => u.is_followed);
    const otherUsers = likeUsers.filter(u => !u.is_followed);

    return [...followedUsers, ...otherUsers].slice(0, limit);
  } catch (error) {
    console.error('Error getting post likes with users:', error);
    return [];
  }
}

// ============= COMMENTS =============

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export async function getPostComments(postId: string): Promise<Comment[]> {
  try {
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('id, post_id, user_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!comments || comments.length === 0) return [];

    // Fetch user profiles
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return comments.map(comment => {
      const profile = profileMap.get(comment.user_id);
      return {
        ...comment,
        username: profile?.username || 'User',
        avatar_url: profile?.avatar_url || null,
      };
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function addPostComment(
  postId: string,
  userId: string,
  content: string,
  successMessage?: string,
  errorMessage?: string,
  emptyErrorMessage?: string
): Promise<Comment | null> {
  try {
    const trimmed = content.trim();
    if (!trimmed) {
      toastError(emptyErrorMessage || 'Comment cannot be empty');
      return null;
    }

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content: trimmed })
      .select('id, post_id, user_id, content, created_at')
      .single();

    if (error) throw error;

    // Notifica immediata all'UI (count live senza refresh)
    emitPostEngagementUpdate({ postId, commentsDelta: 1 });

    // Update comments count on post
    const { data: postData } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', postId)
      .single();

    if (postData) {
      const newCount = (postData.comments_count || 0) + 1;
      await supabase
        .from('posts')
        .update({ comments_count: newCount })
        .eq('id', postId);
    }

    // Fetch commenter profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    // Get post owner for notification
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    // Create notification if not own post
    if (post && post.user_id !== userId) {
      // Get localized notification text
      const { title, message } = await getLocalizedNotificationText(
        post.user_id,
        'new_comment',
        profile?.username || 'Someone'
      );

      const notificationData = {
        user_id: post.user_id,
        type: 'comment',
        title,
        message: `${message}: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}"`,
        data: {
          post_id: postId,
          user_id: userId,        // actor (who left the comment)
          user_name: profile?.username,
          user_avatar: profile?.avatar_url,
          comment_text: trimmed,  // key expected by MobileNotificationItem
        },
      };

      console.log('[addPostComment] Inserting notification:', notificationData);

      const { error: notifError } = await supabase.from('notifications').insert(notificationData);

      if (notifError) {
        console.error('[addPostComment] Notification insert error:', notifError);
      } else {
        console.log('[addPostComment] Notification inserted successfully');
      }
    } else {
      console.log('[addPostComment] Skipping notification - own post or post not found');
    }

    if (successMessage) toastSuccess(successMessage);

    return {
      ...comment,
      username: profile?.username || 'User',
      avatar_url: profile?.avatar_url || null,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    toastError(errorMessage || 'Failed to add comment');
    return null;
  }
}

export async function deletePostComment(
  commentId: string,
  userId: string,
  successMessage?: string,
  errorMessage?: string
): Promise<boolean> {
  try {
    // Get post_id before deleting
    const { data: comment } = await supabase
      .from('post_comments')
      .select('post_id')
      .eq('id', commentId)
      .eq('user_id', userId)
      .single();

    if (!comment) throw new Error('Comment not found');

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;

    // Notifica immediata all'UI (count live senza refresh)
    emitPostEngagementUpdate({ postId: comment.post_id, commentsDelta: -1 });

    // Update comments count on post
    const { data: post } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', comment.post_id)
      .single();

    if (post) {
      const newCount = Math.max(0, (post.comments_count || 0) - 1);
      await supabase
        .from('posts')
        .update({ comments_count: newCount })
        .eq('id', comment.post_id);
    }

    if (successMessage) toastSuccess(successMessage);
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    toastError(errorMessage || 'Failed to delete comment');
    return false;
  }
}

// ============= SHARES =============

export async function sharePost(
  postId: string,
  userId: string,
  recipientIds: string[]
): Promise<boolean> {
  try {
    if (recipientIds.length === 0) {
      toastError('Select at least one person');
      return false;
    }

    // Get post data
    const { data: post } = await supabase
      .from('posts')
      .select('caption, media_urls')
      .eq('id', postId)
      .single();

    if (!post) throw new Error('Post not found');

    // Get sender profile
    const { data: sender } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    // Send to each recipient
    const messages = recipientIds.map((recipientId) => ({
      sender_id: userId,
      receiver_id: recipientId,
      message_type: 'post_share',
      shared_content: {
        post_id: postId,
        caption: post.caption,
        media_urls: post.media_urls,
      },
      content: null,
    }));

    const { error: msgError } = await supabase
      .from('direct_messages')
      .insert(messages);

    if (msgError) throw msgError;

    // Record share count
    const { error: shareError } = await supabase
      .from('post_shares')
      .insert({ user_id: userId, post_id: postId });

    if (shareError) console.warn('Share count error:', shareError);

    emitPostEngagementUpdate({ postId, sharesDelta: 1 });

    // Get sharer's language for localized toast
    const lang = await getUserLanguage(userId);
    const translations = notificationTranslations[lang] || notificationTranslations.en;
    const peopleWord = recipientIds.length === 1 
      ? (translations.person || 'person') 
      : (translations.people || 'people');
    const shareMsg = (translations.post_shared || 'Post shared with {{count}} {{people}}')
      .replace('{{count}}', String(recipientIds.length))
      .replace('{{people}}', peopleWord);
    
    console.log('[sharePost] Showing toast:', shareMsg);
    toastSuccess(shareMsg);
    return true;
  } catch (error) {
    console.error('Error sharing post:', error);
    const lang = await getUserLanguage(userId);
    toastError(getTranslation(lang, 'share_failed'));
    return false;
  }
}

// ============= SAVES =============

export async function togglePostSave(postId: string, userId: string): Promise<boolean> {
  try {
    const lang = await getUserLanguage(userId);
    
    const { data: existing } = await supabase
      .from('post_saves')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Unsave
      await supabase.from('post_saves').delete().eq('id', existing.id);
      toastSuccess(getTranslation(lang, 'post_unsaved'));
      return false;
    } else {
      // Save
      const { error } = await supabase
        .from('post_saves')
        .insert({ post_id: postId, user_id: userId });
      
      if (error) throw error;
      toastSuccess(getTranslation(lang, 'post_saved'));
      return true;
    }
  } catch (error) {
    console.error('Error toggling save:', error);
    const lang = await getUserLanguage(userId);
    toastError(getTranslation(lang, 'save_failed'));
    return false;
  }
}

export async function isPostSaved(postId: string, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('post_saves')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking save status:', error);
    return false;
  }
}
