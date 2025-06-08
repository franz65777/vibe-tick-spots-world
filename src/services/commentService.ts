
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
          profiles!inner (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('place_id', placeId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        return this.getMockComments(placeId);
      }

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        (comments || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              profiles!inner (
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
      return this.getMockComments(placeId);
    }
  }

  private getMockComments(placeId: string): Comment[] {
    return [
      {
        id: '1',
        place_id: placeId,
        user_id: 'mock-user-1',
        content: 'Amazing place! The ambiance was perfect and the coffee was exceptional. Highly recommend for a quiet work session or catching up with friends.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes_count: 12,
        user: {
          username: 'sarah_explorer',
          full_name: 'Sarah Chen',
          avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b5a5c75b?w=100&h=100&fit=crop&crop=face'
        },
        replies: []
      },
      {
        id: '2',
        place_id: placeId,
        user_id: 'mock-user-2',
        content: 'Went here last weekend with my family. The kids loved it and the staff was super friendly. Will definitely be back!',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likes_count: 8,
        user: {
          username: 'mike_wanderer',
          full_name: 'Mike Rodriguez',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
        },
        replies: []
      },
      {
        id: '3',
        place_id: placeId,
        user_id: 'mock-user-3',
        content: 'Perfect spot for a date night! The atmosphere is romantic and the food was incredible. Make sure to try their signature cocktail.',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        likes_count: 15,
        user: {
          username: 'alex_traveler',
          full_name: 'Alex Johnson',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
        },
        replies: []
      }
    ];
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
          profiles!inner (
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
      // Return mock comment for demo purposes
      return {
        id: Date.now().toString(),
        place_id: placeId,
        user_id: 'current-user',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        likes_count: 0,
        user: {
          username: 'you',
          full_name: 'You',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
        },
        replies: []
      };
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
