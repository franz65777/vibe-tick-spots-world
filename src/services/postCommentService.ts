import { supabase } from '@/integrations/supabase/client';

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string): Promise<PostComment[]> {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles!inner(username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((comment: any) => ({
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      username: comment.profiles?.username || 'User',
      avatar_url: comment.profiles?.avatar_url || null,
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

/**
 * Add a comment to a post
 */
export async function addPostComment(
  postId: string,
  userId: string,
  content: string
): Promise<PostComment | null> {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
      })
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at
      `)
      .single();

    if (error) throw error;

    // Fetch user profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    return {
      ...data,
      username: profile?.username || 'User',
      avatar_url: profile?.avatar_url || null,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
}

/**
 * Delete a comment
 */
export async function deletePostComment(commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}

/**
 * Get comment count for a post
 */
export async function getPostCommentCount(postId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
}
