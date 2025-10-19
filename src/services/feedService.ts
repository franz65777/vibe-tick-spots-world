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
  media_urls?: string[]; // Multiple media URLs
  created_at: string;
  rating?: number; // For reviews
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  saves_count?: number;
}

/**
 * Get activity feed for the current user with caching
 */
export async function getUserFeed(userId: string, limit: number = 50): Promise<FeedItem[]> {
  try {
    // Get following list first
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    if (!followingData || followingData.length === 0) {
      return [];
    }

    const followingIds = followingData.map(f => f.following_id);
    
    // Fetch posts and post reviews in parallel
    const [postsResult, reviewsResult] = await Promise.all([
      // Posts from followed users with rating
      supabase
        .from('posts')
        .select('id, user_id, caption, media_urls, location_id, rating, created_at, likes_count, comments_count, shares_count, saves_count')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(30),
      
      // Post reviews from followed users
      supabase
        .from('post_reviews')
        .select('id, post_id, user_id, location_id, comment, rating, created_at')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    const posts = postsResult.data || [];
    const reviews = reviewsResult.data || [];
    
    // Get all user IDs we need to fetch
    const allUserIds = [...new Set([
      ...posts.map(p => p.user_id),
      ...reviews.map(r => r.user_id)
    ])];

    // Get all location IDs we need to fetch
    const allLocationIds = [...new Set([
      ...posts.map(p => p.location_id).filter(Boolean),
      ...reviews.map(r => r.location_id).filter(Boolean)
    ])];

    // Fetch profiles and locations in parallel
    const [profilesResult, locationsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', allUserIds),
      
      allLocationIds.length > 0
        ? supabase
            .from('locations')
            .select('id, name')
            .in('id', allLocationIds)
        : Promise.resolve({ data: [] })
    ]);

    const profilesMap = new Map(
      (profilesResult.data || []).map(p => [p.id, p])
    );

    const locationsMap = new Map(
      (locationsResult.data || []).map(l => [l.id, l])
    );

    // Convert posts to feed items
    const postFeedItems: FeedItem[] = posts.map(post => {
      const profile = profilesMap.get(post.user_id);
      const location = post.location_id ? locationsMap.get(post.location_id) : null;
      
      return {
        id: post.id,
        event_type: post.rating ? 'rated_post' : 'new_post',
        user_id: post.user_id,
        username: profile?.username || 'User',
        avatar_url: profile?.avatar_url || null,
        location_id: post.location_id,
        location_name: location?.name || null,
        post_id: post.id,
        content: post.caption,
        media_url: post.media_urls?.[0] || null,
        media_urls: post.media_urls || [],
        created_at: post.created_at,
        rating: post.rating || undefined,
        likes_count: (post as any).likes_count,
        comments_count: (post as any).comments_count,
        shares_count: (post as any).shares_count,
        saves_count: (post as any).saves_count,
      };
    });

    // Convert reviews to feed items
    const reviewFeedItems: FeedItem[] = reviews.map(review => {
      const profile = profilesMap.get(review.user_id);
      const location = review.location_id ? locationsMap.get(review.location_id) : null;
      
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
        media_url: null,
        created_at: review.created_at,
        rating: review.rating,
      };
    });

    // Combine and sort
    const feedItems = [...postFeedItems, ...reviewFeedItems];
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
  icon: string | null;
  action: string;
  color: string;
  iconType?: 'image' | 'emoji';
} {
  switch (eventType) {
    case 'rated_post':
      return { icon: '⭐', action: 'rated', color: 'text-yellow-500' };
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
