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
  rating?: number; // For reviews
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
    
    const feedItems = (data || []) as FeedItem[];
    
    // Also fetch reviews from followed users
    // First get the list of users we follow
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    if (followingData && followingData.length > 0) {
      const followingIds = followingData.map(f => f.following_id);
      
      // Fetch reviews from posts by followed users
      const { data: reviewsData } = await supabase
        .from('post_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (reviewsData && reviewsData.length > 0) {
        // Get post data to filter by followed users
        const postIds = reviewsData.map(r => r.post_id);
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, user_id, media_urls, location_id')
          .in('id', postIds)
          .in('user_id', followingIds);

        if (postsData) {
          const validPostIds = postsData.map(p => p.id);
          const validReviews = reviewsData.filter(r => validPostIds.includes(r.post_id));
          
          // Get user profiles for reviews
          const reviewUserIds = validReviews.map(r => r.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', reviewUserIds);

          // Get location data
          const locationIds = validReviews.map(r => r.location_id).filter(Boolean);
          const { data: locationsData } = locationIds.length > 0
            ? await supabase
                .from('locations')
                .select('id, name')
                .in('id', locationIds)
            : { data: [] };

          const reviewFeedItems: FeedItem[] = validReviews.map((review) => {
            const post = postsData.find(p => p.id === review.post_id);
            const profile = profilesData?.find(p => p.id === review.user_id);
            const location = locationsData?.find(l => l.id === review.location_id);
            
            return {
              id: review.id,
              event_type: 'review',
              user_id: review.user_id,
              username: profile?.username || 'User',
              avatar_url: profile?.avatar_url || null,
              location_id: review.location_id,
              location_name: location?.name || null,
              post_id: review.post_id,
              content: review.comment,
              media_url: post?.media_urls?.[0] || null,
              created_at: review.created_at,
              rating: review.rating,
            };
          });
          
          feedItems.push(...reviewFeedItems);
        }
      }
    }
    
    // Sort by date
    feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return feedItems.slice(0, limit);
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
    case 'review':
      return { icon: '⭐', action: 'reviewed', color: 'text-yellow-500' };
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
