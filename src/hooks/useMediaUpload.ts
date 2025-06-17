
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploadResult {
  success: boolean;
  mediaId?: string;
  url?: string;
  error?: string;
}

interface StoryUploadResult {
  success: boolean;
  story?: any;
  error?: string;
}

interface PostUploadResult {
  success: boolean;
  post?: any;
  error?: string;
}

export const useMediaUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadStory = async (
    file: File,
    caption?: string,
    locationId?: string,
    locationName?: string,
    locationAddress?: string
  ): Promise<StoryUploadResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/stories/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      // Create story record
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          location_id: locationId || null,
          location_name: locationName || null,
          location_address: locationAddress || null,
          caption: caption || null,
          media_url: publicUrl,
          media_type: file.type.startsWith('image/') ? 'image' : 'video'
        })
        .select()
        .single();

      if (storyError) throw storyError;

      return { success: true, story };
    } catch (error) {
      console.error('Story upload error:', error);
      return {
        success: false,
        error: 'Upload failed'
      };
    } finally {
      setUploading(false);
    }
  };

  const uploadPost = async (
    files: File[],
    caption?: string,
    locationId?: string
  ): Promise<PostUploadResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setUploading(true);

    try {
      // Upload files to storage
      const mediaUrls: string[] = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
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

      return { success: true, post };
    } catch (error) {
      console.error('Post upload error:', error);
      return {
        success: false,
        error: 'Upload failed'
      };
    } finally {
      setUploading(false);
    }
  };

  const uploadMedia = async (
    file: File, 
    locationId?: string
  ): Promise<MediaUploadResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      // Create media record
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert({
          user_id: user.id,
          location_id: locationId,
          file_path: uploadData.path,
          file_type: file.type.startsWith('image/') ? 'image' : 'video',
          file_size: file.size
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      return { 
        success: true, 
        mediaId: mediaData.id,
        url: publicUrl
      };
    } catch (error) {
      console.error('Media upload error:', error);
      return {
        success: false,
        error: 'Upload failed'
      };
    } finally {
      setUploading(false);
    }
  };

  const getMediaUrl = (filePath: string) => {
    return `https://hrmklsvewmhpqixgyjmy.supabase.co/storage/v1/object/public/media/${filePath}`;
  };

  return {
    uploadMedia,
    uploadStory,
    uploadPost,
    getMediaUrl,
    uploading
  };
};
