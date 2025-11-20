
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
  rating?: number; // Optional 1-10 rating
}

export const usePostCreation = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const createPost = async ({ caption, files, location, taggedUsers, rating }: CreatePostData) => {
    if (!user) throw new Error('User not authenticated');
    
    setUploading(true);
    setProgress(0);
    
    try {
      let locationId = null;

      // STEP 1: Handle location creation/finding - ENHANCED DEDUPLICATION
      if (location) {
        console.log('🔍 LOCATION DEDUPLICATION - Enhanced with coordinates');
        console.log('Looking for:', location.name, 'at', location.latitude, location.longitude);
        
        let existingLocation = null;
        
        // STRATEGY 1: Check by Google Place ID (if available)
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
            console.log('✅ FOUND by Google Place ID:', existingLocation.name);
          }
        }

        // STRATEGY 2: Check by COORDINATES (prevent duplicates at same location)
        // This is CRITICAL to prevent the duplicate issue!
        if (!existingLocation && location.latitude && location.longitude) {
          console.log('🔍 Checking by coordinates...');
          
          // Find locations within ~11 meters (0.0001 degrees)
          const threshold = 0.0001;
          const { data: nearbyLocations, error: coordError } = await supabase
            .from('locations')
            .select('id, name, address, latitude, longitude')
            .gte('latitude', location.latitude - threshold)
            .lte('latitude', location.latitude + threshold)
            .gte('longitude', location.longitude - threshold)
            .lte('longitude', location.longitude + threshold);

          if (coordError) {
            console.error('❌ Error checking by coordinates:', coordError);
          } else if (nearbyLocations && nearbyLocations.length > 0) {
            // Use the first nearby location (they're at the same spot)
            existingLocation = nearbyLocations[0];
            console.log('✅ FOUND by coordinates:', existingLocation.name, 'at same location');
          }
        }

        // STRATEGY 3: Check by exact name match (fallback)
        if (!existingLocation) {
          console.log('🔍 Checking by name match...');
          
          const { data: nameLocation, error: nameError } = await supabase
            .from('locations')
            .select('id, name, address')
            .ilike('name', location.name)
            .maybeSingle();

          if (nameError) {
            console.error('❌ Error checking by name:', nameError);
          } else if (nameLocation) {
            existingLocation = nameLocation;
            console.log('✅ FOUND by name:', existingLocation.name);
          }
        }

        if (existingLocation) {
          // EXISTING LOCATION FOUND - USE IT
          console.log('✅ REUSING LOCATION ID:', existingLocation.id);
          locationId = existingLocation.id;
        } else {
          // CREATE NEW LOCATION
          console.log('🆕 CREATING NEW LOCATION');
          
          const { data: newLocation, error: locationError } = await supabase
            .from('locations')
            .insert({
              google_place_id: location.google_place_id || null,
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
            console.error('❌ Error creating location:', locationError);
            throw locationError;
          }
          
          console.log('✅ NEW LOCATION CREATED:', newLocation.id);
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
          rating: rating || null,
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
      
      // Create interaction for rating if provided
      if (rating && locationId) {
        console.log('⭐ Creating review interaction with rating:', rating);
        const { error: interactionError } = await supabase
          .from('interactions')
          .insert({
            user_id: user.id,
            location_id: locationId,
            action_type: 'review',
            weight: rating
          });
        
        if (interactionError) {
          console.error('❌ Error creating review interaction:', interactionError);
          // Don't throw - post is already created, just log the error
        } else {
          console.log('✅ Review interaction created successfully');
        }
      }
      
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
