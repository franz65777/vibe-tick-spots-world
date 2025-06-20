
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const usePostDeletion = () => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const deletePost = async (postId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    setDeleting(true);
    
    try {
      // First, get the post to access media URLs and location_id
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('media_urls, user_id, location_id')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      // Verify the user owns this post
      if (post.user_id !== user.id) {
        throw new Error('Unauthorized to delete this post');
      }

      // Delete associated media files from storage
      if (post.media_urls && Array.isArray(post.media_urls)) {
        for (const mediaUrl of post.media_urls) {
          try {
            // Extract file path from URL
            const url = new URL(mediaUrl);
            const pathParts = url.pathname.split('/');
            const filePath = pathParts.slice(pathParts.indexOf('media') + 1).join('/');
            
            if (filePath) {
              await supabase.storage
                .from('media')
                .remove([filePath]);
            }
          } catch (error) {
            console.warn('Failed to delete media file:', error);
            // Continue with post deletion even if media deletion fails
          }
        }
      }

      // Delete the post record
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // Double-check ownership

      if (deleteError) throw deleteError;

      // Check if this was the last post for the location
      if (post.location_id) {
        console.log('🔍 Checking remaining posts for location:', post.location_id);
        
        const { data: remainingPosts, error: countError } = await supabase
          .from('posts')
          .select('id')
          .eq('location_id', post.location_id);

        if (countError) {
          console.warn('⚠️ Could not check remaining posts:', countError);
        } else if (!remainingPosts || remainingPosts.length === 0) {
          console.log('🗑️ No more posts for location, location will be hidden from Explore');
          // Location will automatically be filtered out by the query in searchService
          // since it looks for locations with posts using inner join
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      return { success: false, error: error as Error };
    } finally {
      setDeleting(false);
    }
  };

  return {
    deletePost,
    deleting
  };
};
