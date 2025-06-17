
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backendService } from '@/services/backendService';

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
      const result = await backendService.uploadStory(
        file,
        caption,
        locationId,
        locationName,
        locationAddress
      );
      
      if (result.success && result.data) {
        return {
          success: true,
          story: result.data
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Upload failed'
        };
      }
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
      const result = await backendService.uploadPost(files, caption, locationId);
      
      if (result.success && result.data) {
        return {
          success: true,
          post: result.data
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Upload failed'
        };
      }
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
      const result = await backendService.uploadMedia(file, user.id, locationId);
      
      if (result.success && result.data) {
        return {
          success: true,
          mediaId: result.data.id,
          url: result.data.file_path
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Upload failed'
        };
      }
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
