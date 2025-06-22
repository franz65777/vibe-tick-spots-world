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

      // STEP 1: CRITICAL - Handle location creation/finding - ABSOLUTELY NO DUPLICATES
      if (location) {
        console.log('🔍 CHECKING FOR EXISTING LOCATION - PREVENTING DUPLICATES');
        console.log('Google Place ID:', location.google_place_id);
        console.log('Location Name:', location.name);
        
        // FIRST: Check by Google Place ID (most reliable)
        let existingLocation = null;
        
        if (location.google_place_id) {
          const { data: googlePlaceLocation, error: googlePlaceError } = await supabase
            .from('locations')
            .select('id, name, google_place_id')
            .eq('google_place_id', location.google_place_id)
            .maybeSingle();

          if (googlePlaceError) {
            console.error('❌ Error checking by Google Place ID:', googlePlaceError);
          } else if (googlePlaceLocation) {
            existingLocation = googlePlaceLocation;
            console.log('✅ FOUND EXISTING by Google Place ID:', existingLocation.name);
          }
        }

        // SECOND: If not found by Google Place ID, check by name + address
        if (!existingLocation) {
          console.log('🔍 No Google Place ID match, checking by name + address...');
          
          const { data: nameAddressLocation, error: nameAddressError } = await supabase
            .from('locations')
            .select('id, name, address')
            .eq('name', location.name)
            .eq('address', location.address)
            .maybeSingle();

          if (nameAddressError) {
            console.error('❌ Error checking by name + address:', nameAddressError);
          } else if (nameAddressLocation) {
            existingLocation = nameAddressLocation;
            console.log('✅ FOUND EXISTING by name + address:', existingLocation.name);
          }
        }

        if (existingLocation) {
          // EXISTING LOCATION FOUND - USE IT, DO NOT CREATE NEW
          console.log('✅ USING EXISTING LOCATION - NO NEW CARD CREATED');
          locationId = existingLocation.id;
        } else {
          // ONLY CREATE NEW LOCATION IF ABSOLUTELY NONE EXISTS
          console.log('🆕 CREATING NEW LOCATION - WILL CREATE NEW CARD');
          
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
            console.error('❌ Error creating new location:', locationError);
            throw locationError;
          }
          
          console.log('✅ NEW LOCATION CREATED - NEW CARD WILL APPEAR');
          locationId = newLocation.id;
        }
      }

      // STEP 2: Upload user's media files
      console.log('📤 Uploading user post media...');
      const mediaUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        console.log(`📤 Uploading user content ${i + 1}/${files.length}:`, fileName);
        
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
        console.log('✅ User post media uploaded:', publicUrl);
      }

      // STEP 3: Create post record - ADD TO EXISTING LOCATION'S LIBRARY
      console.log('📝 ADDING POST TO LOCATION LIBRARY (NOT CREATING NEW CARD)');
      console.log('Location ID:', locationId);
      
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

      console.log('✅ POST SUCCESSFULLY ADDED TO LOCATION LIBRARY!');
      console.log('📍 No duplicate cards - post added to existing location');
      console.log('Post ID:', post.id, 'Location ID:', post.location_id);
      
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
