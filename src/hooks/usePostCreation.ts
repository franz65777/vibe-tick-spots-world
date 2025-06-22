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

      // STEP 1: Handle location creation/finding - CRITICAL FIX FOR LOCATION LINKING
      if (location) {
        console.log('🔍 CRITICAL: Checking for existing location by Google Place ID:', location.google_place_id);
        
        // CHECK FOR EXISTING LOCATION FIRST - this prevents duplicates
        const { data: existingLocation, error: locationFetchError } = await supabase
          .from('locations')
          .select('id, name, google_place_id')
          .eq('google_place_id', location.google_place_id)
          .maybeSingle();

        if (locationFetchError) {
          console.error('❌ CRITICAL ERROR checking existing location:', locationFetchError);
          throw locationFetchError;
        }

        if (existingLocation) {
          // EXISTING LOCATION FOUND - USE IT, DO NOT CREATE NEW
          console.log('✅ CRITICAL: Found existing location - using existing ID:', existingLocation.id);
          console.log('✅ Existing location name:', existingLocation.name);
          locationId = existingLocation.id;
        } else {
          // NO EXISTING LOCATION - CREATE NEW ONE
          console.log('🆕 CRITICAL: Creating new location for Google Place ID:', location.google_place_id);
          
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

          if (locationError) {
            console.error('❌ CRITICAL ERROR creating new location:', locationError);
            throw locationError;
          }
          
          console.log('✅ CRITICAL: Created new location with ID:', newLocation.id);
          locationId = newLocation.id;
        }
      }

      // STEP 2: Upload files to storage
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

      // STEP 3: Create post record with location_id - CRITICAL FOR LOCATION LINKING
      console.log('📝 CRITICAL: Creating post record with location_id:', locationId);
      
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: locationId, // CRITICAL: Always save location_id in posts table
          caption: caption || null,
          media_urls: mediaUrls,
        })
        .select('id, location_id')
        .single();

      if (postError) {
        console.error('❌ CRITICAL ERROR creating post:', postError);
        throw postError;
      }

      console.log('✅ CRITICAL SUCCESS: POST CREATED AND LINKED TO LOCATION!');
      console.log('Post ID:', post.id, 'linked to location_id:', post.location_id);
      
      // VERIFICATION: Check that the post is properly linked
      if (locationId && post.location_id === locationId) {
        console.log('✅ VERIFICATION PASSED: Post correctly linked to location');
      } else {
        console.warn('⚠️ VERIFICATION WARNING: Post linking may have issues');
      }
      
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
