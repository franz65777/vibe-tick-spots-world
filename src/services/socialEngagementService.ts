import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Unified Social Engagement Service
 * Handles likes, comments, shares across posts with proper notifications
 */

// Notification translations for all supported languages
const notificationTranslations: Record<string, Record<string, string>> = {
  en: {
    new_like_title: 'New like',
    new_like_message: '{{username}} liked your post',
    new_comment_title: 'New comment',
    new_comment_message: '{{username}} commented on your post',
  },
  it: {
    new_like_title: 'Nuovo mi piace',
    new_like_message: '{{username}} ha messo mi piace al tuo post',
    new_comment_title: 'Nuovo commento',
    new_comment_message: '{{username}} ha commentato il tuo post',
  },
  es: {
    new_like_title: 'Nuevo me gusta',
    new_like_message: '{{username}} le dio me gusta a tu publicación',
    new_comment_title: 'Nuevo comentario',
    new_comment_message: '{{username}} comentó en tu publicación',
  },
  fr: {
    new_like_title: 'Nouveau j\'aime',
    new_like_message: '{{username}} a aimé votre publication',
    new_comment_title: 'Nouveau commentaire',
    new_comment_message: '{{username}} a commenté votre publication',
  },
  de: {
    new_like_title: 'Neues Like',
    new_like_message: '{{username}} gefällt dein Beitrag',
    new_comment_title: 'Neuer Kommentar',
    new_comment_message: '{{username}} hat deinen Beitrag kommentiert',
  },
  pt: {
    new_like_title: 'Nova curtida',
    new_like_message: '{{username}} curtiu sua publicação',
    new_comment_title: 'Novo comentário',
    new_comment_message: '{{username}} comentou na sua publicação',
  },
  zh: {
    new_like_title: '新点赞',
    new_like_message: '{{username}} 点赞了你的帖子',
    new_comment_title: '新评论',
    new_comment_message: '{{username}} 评论了你的帖子',
  },
  ja: {
    new_like_title: '新しいいいね',
    new_like_message: '{{username}}があなたの投稿にいいねしました',
    new_comment_title: '新しいコメント',
    new_comment_message: '{{username}}があなたの投稿にコメントしました',
  },
  ko: {
    new_like_title: '새 좋아요',
    new_like_message: '{{username}}님이 게시물을 좋아합니다',
    new_comment_title: '새 댓글',
    new_comment_message: '{{username}}님이 댓글을 남겼습니다',
  },
  ar: {
    new_like_title: 'إعجاب جديد',
    new_like_message: '{{username}} أعجب بمنشورك',
    new_comment_title: 'تعليق جديد',
    new_comment_message: '{{username}} علق على منشورك',
  },
  hi: {
    new_like_title: 'नई लाइक',
    new_like_message: '{{username}} ने आपकी पोस्ट को लाइक किया',
    new_comment_title: 'नई टिप्पणी',
    new_comment_message: '{{username}} ने आपकी पोस्ट पर टिप्पणी की',
  },
  ru: {
    new_like_title: 'Новый лайк',
    new_like_message: '{{username}} понравилась ваша публикация',
    new_comment_title: 'Новый комментарий',
    new_comment_message: '{{username}} прокомментировал вашу публикацию',
  },
  tr: {
    new_like_title: 'Yeni beğeni',
    new_like_message: '{{username}} gönderinizi beğendi',
    new_comment_title: 'Yeni yorum',
    new_comment_message: '{{username}} gönderinize yorum yaptı',
  },
};

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
    
    let lang = profile?.language || 'en';
    if (lang === 'zh-CN') lang = 'zh';
    
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
    toast.error('Failed to update like');
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
      toast.error(emptyErrorMessage || 'Comment cannot be empty');
      return null;
    }

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content: trimmed })
      .select('id, post_id, user_id, content, created_at')
      .single();

    if (error) throw error;

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

      await supabase.from('notifications').insert({
        user_id: post.user_id,
        type: 'comment',
        title,
        message: `${message}: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}"`,
        data: {
          post_id: postId,
          user_id: userId,
          user_name: profile?.username,
          user_avatar: profile?.avatar_url,
          comment: trimmed,
        },
      });
    }

    toast.success(successMessage || 'Comment added');

    return {
      ...comment,
      username: profile?.username || 'User',
      avatar_url: profile?.avatar_url || null,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    toast.error(errorMessage || 'Failed to add comment');
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

    toast.success(successMessage || 'Comment deleted');
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    toast.error(errorMessage || 'Failed to delete comment');
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
      toast.error('Select at least one person');
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
    const messages = recipientIds.map(recipientId => ({
      sender_id: userId,
      receiver_id: recipientId,
      message_type: 'post',
      shared_content: {
        post_id: postId,
        caption: post.caption,
        media_urls: post.media_urls,
      },
      content: `${sender?.username || 'Someone'} shared a post with you`,
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

    toast.success(`Post shared with ${recipientIds.length} ${recipientIds.length === 1 ? 'person' : 'people'}`);
    return true;
  } catch (error) {
    console.error('Error sharing post:', error);
    toast.error('Failed to share post');
    return false;
  }
}

// ============= SAVES =============

export async function togglePostSave(postId: string, userId: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('post_saves')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Unsave
      await supabase.from('post_saves').delete().eq('id', existing.id);
      toast.success('Post unsaved');
      return false;
    } else {
      // Save
      const { error } = await supabase
        .from('post_saves')
        .insert({ post_id: postId, user_id: userId });
      
      if (error) throw error;
      toast.success('Post saved');
      return true;
    }
  } catch (error) {
    console.error('Error toggling save:', error);
    toast.error('Failed to update save');
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
