import { supabase } from '@/integrations/supabase/client';
import { getCachedData } from './performanceService';

export interface FeedItem {
  id: string;
  event_type: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  location_id: string | null;
  location_name: string | null;
  post_id: string | null;
  content: string | null;
  media_url: string | null;
  created_at: string;
}

/**
 * Get activity feed for the current user with caching
 */
export async function getUserFeed(userId: string, limit: number = 50): Promise<FeedItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_feed', {
      target_user_id: userId,
      feed_limit: limit,
    });
    if (error) throw error;
    return (data || []) as FeedItem[];
  } catch (error) {
    console.error('Error fetching user feed:', error);
    return [];
  }
}


/**
 * Get event icon and text for feed items
 */
export function getFeedEventDisplay(eventType: string): {
  icon: string;
  action: string;
  color: string;
} {
  switch (eventType) {
    case 'saved_place':
      return { icon: '📍', action: 'saved', color: 'text-blue-500' };
    case 'saved_location':
      return { icon: '📌', action: 'saved', color: 'text-blue-500' };
    case 'new_post':
      return { icon: '📸', action: 'posted about', color: 'text-pink-500' };
    case 'new_comment':
      return { icon: '💬', action: 'commented on', color: 'text-green-500' };
    case 'like_location':
      return { icon: '❤️', action: 'liked', color: 'text-red-500' };
    case 'save_location':
      return { icon: '📌', action: 'saved', color: 'text-blue-500' };
    case 'visit_location':
      return { icon: '🚶', action: 'visited', color: 'text-green-500' };
    case 'share_location':
      return { icon: '↗️', action: 'shared', color: 'text-purple-500' };
    default:
      return { icon: '✨', action: 'interacted with', color: 'text-gray-500' };
  }
}
