
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CreatePostData {
  caption?: string;
  files: File[];
  location?: {
    google_place_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    types: string[];
  };
}

export const usePostCreation = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const createPost = async ({ caption, files, location }: CreatePostData) => {
    if (!user) throw new Error('User not authenticated');
    
    setUploading(true);
    
    try {
      let locationId = null;

      // Create or find location if provided
      if (location) {
        // First check if location already exists by Google Place ID
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', location.google_place_id)
          .single();

        if (existingLocation) {
          locationId = existingLocation.id;
        } else {
          // Create new location
          const { data: newLocation, error: locationError } = await supabase
            .from('locations')
            .insert({
              google_place_id: location.google_place_id,
              name: location.name,
              address: location.address,
              latitude: location.latitude,
              longitude: location.longitude,
              category: location.types[0] || 'establishment',
              place_types: location.types,
              created_by: user.id,
              pioneer_user_id: user.id
            })
            .select('id')
            .single();

          if (locationError) throw locationError;
          locationId = newLocation.id;
        }
      }

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
          location_id: locationId,
          caption: caption || null,
          media_urls: mediaUrls,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Note: Post count will be updated automatically by the database trigger

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
