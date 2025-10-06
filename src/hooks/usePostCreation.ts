
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
  taggedUsers?: string[]; // Array of user IDs
}

export const usePostCreation = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const createPost = async ({ caption, files, location, taggedUsers }: CreatePostData) => {
    if (!user) throw new Error('User not authenticated');
    
    setUploading(true);
    setProgress(0);
    
    try {
      let locationId = null;

      // STEP 1: Handle location creation/finding - CRITICAL FIX
      if (location) {
        console.log('🔍 LOCATION LINKING - CRITICAL FIX');
        console.log('Looking for location:', location.name);
        console.log('Google Place ID:', location.google_place_id);
        
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

        // SECOND: If not found by Google Place ID, check by exact name match (case-insensitive)
        if (!existingLocation) {
          console.log('🔍 No Google Place ID match, checking by exact name...');
          
          const { data: nameLocation, error: nameError } = await supabase
            .from('locations')
            .select('id, name, address')
            .ilike('name', location.name) // Case-insensitive exact match
            .maybeSingle();

          if (nameError) {
            console.error('❌ Error checking by name:', nameError);
          } else if (nameLocation) {
            existingLocation = nameLocation;
            console.log('✅ FOUND EXISTING by name:', existingLocation.name);
          }
        }

        if (existingLocation) {
          // EXISTING LOCATION FOUND - USE IT
          console.log('✅ USING EXISTING LOCATION ID:', existingLocation.id);
          locationId = existingLocation.id;
        } else {
          // CREATE NEW LOCATION
          console.log('🆕 CREATING NEW LOCATION');
          
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
          
          console.log('✅ NEW LOCATION CREATED with ID:', newLocation.id);
          locationId = newLocation.id;
        }
      }

      setProgress(25);

      // STEP 2: Upload media files
      console.log('📤 Uploading media files...');
      const mediaUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(uploadData.path);
        
        mediaUrls.push(publicUrl);
        console.log('✅ Media uploaded:', publicUrl);
        
        // Update progress based on file upload completion
        setProgress(25 + (50 * (i + 1) / files.length));
      }

      setProgress(75);

      // STEP 3: Create post record with EXPLICIT location linking
      console.log('📝 CREATING POST WITH LOCATION ID:', locationId);
      
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: locationId, // CRITICAL: This must match the location ID
          caption: caption || null,
          media_urls: mediaUrls,
          tagged_users: taggedUsers || [],
        })
        .select('id, location_id')
        .single();

      if (postError) {
        console.error('❌ Error creating post:', postError);
        throw postError;
      }

      setProgress(100);

      console.log('✅ POST CREATED SUCCESSFULLY!');
      console.log('Post ID:', post.id, 'Location ID:', post.location_id);
      
      // VERIFICATION: Double-check the link was created correctly
      if (locationId && post.location_id === locationId) {
        console.log('✅ LOCATION LINK VERIFIED CORRECTLY');
      } else {
        console.error('❌ LOCATION LINK MISMATCH!', {
          expected: locationId,
          actual: post.location_id
        });
      }
      
      return { success: true, post };
    } catch (error) {
      console.error('❌ CRITICAL ERROR in post creation:', error);
      return { success: false, error: error as Error };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    createPost,
    uploading,
    progress
  };
};
