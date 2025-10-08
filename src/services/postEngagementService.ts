import { supabase } from '@/integrations/supabase/client';

/**
 * Complete rewrite of post engagement service for likes, comments, and shares
 */

export interface PostEngagementCounts {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

/**
 * Toggle like on a post
 */
export async function togglePostLike(userId: string, postId: string): Promise<boolean> {
  try {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (error) throw error;
      return true;
    } else {
      // Like
      const { error } = await supabase
        .from('post_likes')
        .insert({ user_id: userId, post_id: postId });

      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.error('Error toggling post like:', error);
    return false;
  }
}

/**
 * Toggle save on a post
 */
export async function togglePostSave(userId: string, postId: string): Promise<boolean> {
  try {
    // Check if already saved
    const { data: existingSave } = await supabase
      .from('post_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existingSave) {
      // Unsave
      const { error } = await supabase
        .from('post_saves')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (error) throw error;
      return true;
    } else {
      // Save
      const { error } = await supabase
        .from('post_saves')
        .insert({ user_id: userId, post_id: postId });

      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.error('Error toggling post save:', error);
    return false;
  }
}

/**
 * Record a post share
 */
export async function recordPostShare(userId: string, postId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_shares')
      .insert({ user_id: userId, post_id: postId });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording post share:', error);
    return false;
  }
}

/**
 * Get user's liked posts
 */
export async function getUserLikedPosts(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId);

    if (error) throw error;
    return new Set(data?.map(l => l.post_id) || []);
  } catch (error) {
    console.error('Error getting liked posts:', error);
    return new Set();
  }
}

/**
 * Get user's saved posts
 */
export async function getUserSavedPosts(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('post_saves')
      .select('post_id')
      .eq('user_id', userId);

    if (error) throw error;
    return new Set(data?.map(s => s.post_id) || []);
  } catch (error) {
    console.error('Error getting saved posts:', error);
    return new Set();
  }
}

/**
 * Get post engagement counts
 */
export async function getPostEngagementCounts(postId: string): Promise<PostEngagementCounts> {
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('likes_count, comments_count, shares_count, saves_count')
      .eq('id', postId)
      .single();

    if (error) throw error;

    return {
      likes: post?.likes_count || 0,
      comments: post?.comments_count || 0,
      shares: post?.shares_count || 0,
      saves: post?.saves_count || 0,
    };
  } catch (error) {
    console.error('Error getting engagement counts:', error);
    return { likes: 0, comments: 0, shares: 0, saves: 0 };
  }
}

/**
 * Check if user has liked a post
 */
export async function hasUserLikedPost(userId: string, postId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking if user liked post:', error);
    return false;
  }
}

/**
 * Check if user has saved a post
 */
export async function hasUserSavedPost(userId: string, postId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('post_saves')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking if user saved post:', error);
    return false;
  }
}
