
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Story {
  id: string;
  user_id: string;
  location_id?: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
  location_name?: string;
  location_address?: string;
  expires_at: string;
  created_at: string;
  metadata: any;
}

export const useStories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

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
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      if (locationId) formData.append('locationId', locationId);
      if (locationName) formData.append('locationName', locationName);
      if (locationAddress) formData.append('locationAddress', locationAddress);

      const { data, error } = await supabase.functions.invoke('upload-story', {
        body: formData,
      });

      if (error) throw error;

      // Refresh stories
      await fetchStories();
      return data.story;
    } catch (error) {
      console.error('Error uploading story:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  return {
    stories,
    loading,
    uploading,
    uploadStory,
    refetch: fetchStories,
  };
};
