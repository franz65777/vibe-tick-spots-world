
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
      // For now, return mock comments since the database relationship needs to be fixed
      console.error('Error fetching comments: Database relationship between comments and profiles needs to be configured');
      return this.getMockComments(placeId);
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
        content: 'Amazing place! The ambiance was perfect and the coffee was exceptional. Highly recommend for a quiet work session or catching up with friends. ☕️✨',
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
        content: 'Went here last weekend with my family. The kids loved it and the staff was super friendly. Will definitely be back! 👨‍👩‍👧‍👦❤️',
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
        content: 'Perfect spot for a date night! The atmosphere is romantic and the food was incredible. Make sure to try their signature cocktail. 🍸🌹',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        likes_count: 15,
        user: {
          username: 'alex_traveler',
          full_name: 'Alex Johnson',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
        },
        replies: []
      },
      {
        id: '4',
        place_id: placeId,
        user_id: 'mock-user-4',
        content: 'This place has the most Instagram-worthy interior! Great for content creators. The lighting is perfect and the food presentation is on point. 📸✨',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        likes_count: 22,
        user: {
          username: 'emma_lifestyle',
          full_name: 'Emma Wilson',
          avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
        },
        replies: []
      },
      {
        id: '5',
        place_id: placeId,
        user_id: 'mock-user-5',
        content: 'Best brunch spot in the city! The avocado toast is to die for and the coffee art is amazing. Weekend vibes all day! 🥑☕️',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        likes_count: 18,
        user: {
          username: 'lucas_foodie',
          full_name: 'Lucas Martinez',
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
        },
        replies: []
      }
    ];
  }

  async addComment(placeId: string, content: string, parentCommentId?: string): Promise<Comment | null> {
    try {
      // For demo purposes, return a mock comment
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
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  async toggleCommentLike(commentId: string): Promise<boolean> {
    try {
      // For demo purposes, return success
      return true;
    } catch (error) {
      console.error('Error toggling comment like:', error);
      return false;
    }
  }
}

export const commentService = new CommentService();
