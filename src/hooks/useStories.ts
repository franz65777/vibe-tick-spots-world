
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  user?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
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
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedStories = (data || []).map((story: any) => ({
        ...story,
        user: story.profiles
      }));

      setStories(formattedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption || '');
      formData.append('locationId', locationId || '');
      formData.append('locationName', locationName || '');
      formData.append('locationAddress', locationAddress || '');

      const { data, error } = await supabase.functions.invoke('upload-story', {
        body: formData
      });

      if (error) throw error;

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
