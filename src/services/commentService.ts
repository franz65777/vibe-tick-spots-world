
import { supabase } from '@/integrations/supabase/client';

export interface Comment {
  id: string;
  place_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  parent_comment_id?: string;
  user?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  replies?: Comment[];
  is_liked?: boolean;
}

class CommentService {
  async getCommentsForPlace(placeId: string): Promise<Comment[]> {
    try {
      // Get comments with user info
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('place_id', placeId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        (comments || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              profiles!comments_user_id_fkey (
                username,
                full_name,
                avatar_url
              )
            `)
            .eq('parent_comment_id', comment.id)
            .order('created_at', { ascending: true });

          return {
            ...comment,
            user: comment.profiles,
            replies: replies?.map(reply => ({
              ...reply,
              user: reply.profiles
            })) || []
          };
        })
      );

      return commentsWithReplies;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  async addComment(placeId: string, content: string, parentCommentId?: string): Promise<Comment | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          place_id: placeId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId
        })
        .select(`
          *,
          profiles!comments_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        user: data.profiles
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  async toggleCommentLike(commentId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;
        return false;
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id
          });

        if (error) throw error;
        return true;
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      return false;
    }
  }
}

export const commentService = new CommentService();
