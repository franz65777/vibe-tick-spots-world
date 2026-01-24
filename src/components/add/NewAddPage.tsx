import React, { useCallback, useEffect, memo } from 'react';
import { PostEditor } from './PostEditor';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useAddPageState } from '@/hooks/useAddPageState';

export const NewAddPage = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { businessProfile, hasValidBusinessAccount } = useBusinessProfile();
  
  // Consolidated state management
  const {
    selectedFiles,
    previewUrls,
    caption,
    selectedLocation,
    selectedCategory,
    taggedUsers,
    rating,
    isUploading,
    businessLocation,
    setCaption,
    setTaggedUsers,
    setRating,
    setIsUploading,
    addFiles,
    removeFile,
    setLocationWithCategory,
    setBusinessLocationWithAutoSelect,
    resetState,
  } = useAddPageState();

  // Fetch business location if this is a business account
  useEffect(() => {
    const fetchBusinessLocation = async () => {
      if (!hasValidBusinessAccount || !businessProfile) return;
      
      try {
        // Parallel fetch: get location claim and location data together
        const { data: locationClaim } = await supabase
          .from('location_claims')
          .select('location_id')
          .eq('business_id', businessProfile.id)
          .eq('verification_status', 'verified')
          .limit(1)
          .maybeSingle();

        if (locationClaim) {
          const { data: location } = await supabase
            .from('locations')
            .select('*')
            .eq('id', locationClaim.location_id)
            .single();

          if (location) {
            // Single state update for all business location data
            setBusinessLocationWithAutoSelect(
              location,
              {
                place_id: location.google_place_id || location.id,
                name: location.name,
                formatted_address: location.address,
                geometry: {
                  location: {
                    lat: () => location.latitude,
                    lng: () => location.longitude
                  }
                },
                types: []
              },
              location.category
            );
          }
        }
      } catch (error) {
        console.error('Error fetching business location:', error);
      }
    };

    fetchBusinessLocation();
  }, [hasValidBusinessAccount, businessProfile, setBusinessLocationWithAutoSelect]);

  // Memoized file selection handler with batched updates
  const handleFilesSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    const newFiles = validFiles.slice(0, 5 - selectedFiles.length);
    
    if (newFiles.length > 0) {
      // Generate all URLs first, then batch update state
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      addFiles(newFiles, newUrls);
    }
  }, [selectedFiles.length, addFiles]);

  // Memoized location handler
  const handleLocationSelect = useCallback((location: any) => {
    // Prevent location change if business account
    if (hasValidBusinessAccount && businessLocation) {
      toast.info(t('locationLockedToBusiness', { ns: 'business' }));
      return;
    }

    if (location === null) {
      setLocationWithCategory(null, '');
      return;
    }

    // Extract coordinates - OSM provides coordinates.lat/lng, Google provides geometry.location.lat()/lng()
    const lat = location.coordinates?.lat ?? location.lat ?? location.geometry?.location?.lat?.();
    const lng = location.coordinates?.lng ?? location.lng ?? location.geometry?.location?.lng?.();
    
    // Use category from autocomplete if available (mapped from Nominatim/database)
    let category = location.category || 'place';
    
    // Fallback: Auto-detect category from place types if no category provided
    if (category === 'place' && location.types && location.types.length > 0) {
      const types = location.types;
      const categoryMapping: { [key: string]: string } = {
        'restaurant': 'restaurant',
        'cafe': 'cafe',
        'bar': 'bar',
        'night_club': 'bar',
        'lodging': 'hotel',
        'museum': 'museum',
        'tourist_attraction': 'entertainment',
        'amusement_park': 'entertainment',
        'bakery': 'bakery',
        'meal_takeaway': 'restaurant',
        'meal_delivery': 'restaurant'
      };

      for (const type of types) {
        if (categoryMapping[type]) {
          category = categoryMapping[type];
          break;
        }
      }
    }

    // Single state update for location and category
    setLocationWithCategory(
      {
        place_id: location.id || `osm_${Date.now()}`,
        name: location.name,
        formatted_address: location.address,
        city: location.city,
        category: category,
        geometry: {
          location: {
            lat: () => lat,
            lng: () => lng
          }
        },
        types: location.types || []
      },
      category
    );
  }, [hasValidBusinessAccount, businessLocation, t, setLocationWithCategory]);

  // Memoized file upload
  const uploadFiles = useCallback(async (): Promise<string[]> => {
    if (!user || selectedFiles.length === 0) return [];

    const uploadPromises = selectedFiles.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `posts/${user.id}/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  }, [user, selectedFiles]);

  // Memoized submit handler with parallelized location lookup
  const handleSubmit = useCallback(async () => {
    if (!user || !selectedLocation || !selectedCategory) {
      toast.error(t('selectLocationAndCategory', { ns: 'add' }));
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload media files
      const mediaUrls = await uploadFiles();
      
      // Find or create location with PARALLEL strategies
      let locationId = null;
      const lat = selectedLocation.geometry?.location?.lat?.();
      const lng = selectedLocation.geometry?.location?.lng?.();
      
      // PARALLEL STRATEGY: Check coordinates and name simultaneously
      if (lat != null && lng != null) {
        const threshold = 0.0001; // ~11 meters
        
        const [coordResult, nameResult] = await Promise.all([
          // Strategy 1: Check by coordinates
          supabase
            .from('locations')
            .select('id, name')
            .gte('latitude', lat - threshold)
            .lte('latitude', lat + threshold)
            .gte('longitude', lng - threshold)
            .lte('longitude', lng + threshold)
            .limit(1),
          // Strategy 2: Check by name
          supabase
            .from('locations')
            .select('id, name, latitude, longitude')
            .ilike('name', selectedLocation.name)
            .not('latitude', 'is', null)
            .limit(1)
        ]);
        
        if (coordResult.data && coordResult.data.length > 0) {
          locationId = coordResult.data[0].id;
        } else if (nameResult.data && nameResult.data.length > 0) {
          locationId = nameResult.data[0].id;
        }
      }
      
      // Create new location if not found
      if (!locationId) {
        if (lat == null || lng == null) {
          toast.error(t('invalidLocation', { ns: 'add' }));
          setIsUploading(false);
          return;
        }
        
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            name: selectedLocation.name,
            address: selectedLocation.formatted_address,
            latitude: lat,
            longitude: lng,
            category: selectedCategory,
            created_by: user.id,
            pioneer_user_id: user.id
          })
          .select('id')
          .single();
        
        if (locationError) throw locationError;
        locationId = newLocation.id;
      }
      
      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: locationId,
          caption: caption.trim() || null,
          media_urls: mediaUrls,
          tagged_users: taggedUsers.map(u => u.id),
          rating: rating || null,
        })
        .select()
        .single();
      
      if (postError) throw postError;
      
      // Auto-save location as "visited" (non-blocking)
      if (locationId) {
        (async () => {
          try {
            const { data: existingSave } = await supabase
              .from('user_saved_locations')
              .select('id')
              .eq('user_id', user.id)
              .eq('location_id', locationId)
              .eq('save_tag', 'been')
              .maybeSingle();
            
            if (!existingSave) {
              await supabase
                .from('user_saved_locations')
                .insert({
                  user_id: user.id,
                  location_id: locationId,
                  save_tag: 'been'
                });
              console.log('✅ Location auto-saved as visited');
            }
          } catch (err) {
            console.warn('⚠️ Failed to auto-save location:', err);
          }
        })();
      }
      
      toast.success(t('postShared', { ns: 'add' }));
      resetState();
      navigate('/');
      
    } catch (error) {
      console.error('❌ Error creating post:', error);
      toast.error(t('errorCreating', { ns: 'add' }));
    } finally {
      setIsUploading(false);
    }
  }, [user, selectedLocation, selectedCategory, caption, taggedUsers, rating, uploadFiles, t, setIsUploading, resetState, navigate]);

  // Memoized user tag handlers
  const handleUserTagged = useCallback((taggedUser: any) => {
    setTaggedUsers(prev => [...prev, taggedUser]);
  }, [setTaggedUsers]);

  const handleUserRemoved = useCallback((userId: string) => {
    setTaggedUsers(prev => prev.filter(u => u.id !== userId));
  }, [setTaggedUsers]);

  // Memoized category change handler
  const handleCategoryChange = useCallback((category: string) => {
    setLocationWithCategory(selectedLocation, category);
  }, [selectedLocation, setLocationWithCategory]);

  return (
    <PostEditor
      selectedFiles={selectedFiles}
      previewUrls={previewUrls}
      caption={caption}
      selectedLocation={selectedLocation}
      selectedCategory={selectedCategory}
      taggedUsers={taggedUsers}
      rating={hasValidBusinessAccount ? undefined : rating}
      isUploading={isUploading}
      onFilesSelect={handleFilesSelect}
      onRemoveFile={removeFile}
      onCaptionChange={setCaption}
      onLocationSelect={handleLocationSelect}
      onCategoryChange={handleCategoryChange}
      onUserTagged={handleUserTagged}
      onUserRemoved={handleUserRemoved}
      onRatingChange={hasValidBusinessAccount ? undefined : setRating}
      onSubmit={handleSubmit}
      isBusinessAccount={hasValidBusinessAccount}
    />
  );
});

NewAddPage.displayName = 'NewAddPage';
