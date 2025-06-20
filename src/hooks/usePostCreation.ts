
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

      // Handle location creation/finding FIRST - THIS IS THE CRITICAL FIX
      if (location) {
        console.log('🔍 CHECKING FOR EXISTING LOCATION:', location.name);
        console.log('Google Place ID:', location.google_place_id);
        
        // STEP 1: Check if location already exists by Google Place ID
        const { data: existingLocation, error: locationFetchError } = await supabase
          .from('locations')
          .select('id, name, google_place_id')
          .eq('google_place_id', location.google_place_id)
          .maybeSingle();

        if (locationFetchError) {
          console.error('❌ Error checking existing location:', locationFetchError);
          throw locationFetchError;
        }

        if (existingLocation) {
          // STEP 2A: Location exists - use it, don't create new one
          console.log('✅ FOUND EXISTING LOCATION - USING IT');
          console.log('Existing location:', existingLocation.name, 'ID:', existingLocation.id);
          locationId = existingLocation.id;
        } else {
          // STEP 2B: Location doesn't exist - create new one
          console.log('🆕 CREATING NEW LOCATION CARD');
          
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
            .select('id, name')
            .single();

          if (locationError) {
            console.error('❌ Error creating location:', locationError);
            throw locationError;
          }
          
          console.log('✅ Created new location card:', newLocation.name, 'ID:', newLocation.id);
          locationId = newLocation.id;
        }
      }

      // STEP 3: Upload files to storage
      console.log('📤 Uploading files to storage...');
      const mediaUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        console.log(`📤 Uploading file ${i + 1}/${files.length}:`, fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('❌ Upload error for file:', fileName, uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
        
        mediaUrls.push(publicUrl);
        console.log('✅ File uploaded successfully:', publicUrl);
      }

      // STEP 4: Create post record linked to the location
      console.log('📝 Creating post record...');
      console.log('Post will be linked to location_id:', locationId);
      
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: locationId,
          caption: caption || null,
          media_urls: mediaUrls,
        })
        .select('id, location_id')
        .single();

      if (postError) {
        console.error('❌ Error creating post:', postError);
        throw postError;
      }

      console.log('✅ POST CREATED SUCCESSFULLY!');
      console.log('Post ID:', post.id);
      console.log('Linked to location ID:', post.location_id);
      
      return { success: true, post };
    } catch (error) {
      console.error('❌ CRITICAL ERROR in post creation:', error);
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
