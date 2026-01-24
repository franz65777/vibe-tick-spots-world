import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchStoriesCoalesced } from '@/lib/coalescedFetchers';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  location_id?: string;
  location_name?: string;
  location_address?: string;
  created_at: string;
  expires_at: string;
  metadata?: any;
}

export const useStories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Coalesced fetch to prevent thundering herd with 20k+ users
  const fetchStories = useCallback(async () => {
    try {
      console.log('Fetching stories (coalesced)...');
      const data = await fetchStoriesCoalesced(user?.id || null);
      console.log('Stories fetched successfully:', data.length);
      setStories(data);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const uploadStory = async (
    file: File,
    caption?: string,
    locationId?: string,
    locationName?: string,
    locationAddress?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    setUploading(true);
    try {
      console.log('Uploading story with location:', locationName);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption || '');
      formData.append('locationId', locationId || '');
      formData.append('locationName', locationName || '');
      formData.append('locationAddress', locationAddress || '');

      const { data, error } = await supabase.functions.invoke('upload-story', {
        body: formData
      });

      if (error) {
        console.error('Story upload error:', error);
        throw error;
      }

      console.log('Story uploaded successfully:', data);
      
      // Refresh stories list
      await fetchStories();
      
      return data;
    } catch (error) {
      console.error('Error uploading story:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    stories,
    loading,
    uploading,
    uploadStory,
    refetch: fetchStories
  };
};
