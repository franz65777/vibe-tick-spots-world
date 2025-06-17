
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CreatePostData {
  caption?: string;
  locationId?: string;
  files: File[];
}

export const usePostCreation = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const createPost = async ({ caption, locationId, files }: CreatePostData) => {
    if (!user) throw new Error('User not authenticated');
    
    setUploading(true);
    
    try {
      // Upload files to storage
      const mediaUrls: string[] = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
        
        mediaUrls.push(publicUrl);
      }

      // Create post record
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: locationId || null,
          caption: caption || null,
          media_urls: mediaUrls,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Update user's posts count by fetching current count and incrementing
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('posts_count')
          .eq('id', user.id)
          .single();

        const currentCount = profile?.posts_count || 0;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ posts_count: currentCount + 1 })
          .eq('id', user.id);
        
        if (updateError) {
          console.warn('Could not update posts count:', updateError);
        }
      } catch (error) {
        console.warn('Could not update posts count:', error);
      }

      return { success: true, post };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error as Error };
    } finally {
      setUploading(false);
    }
  };

  return {
    createPost,
    uploading
  };
};
