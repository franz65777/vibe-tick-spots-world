import React, { useState } from 'react';
import { PostEditor } from './PostEditor';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

export const NewAddPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { businessProfile, hasValidBusinessAccount } = useBusinessProfile();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [rating, setRating] = useState<number | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [businessLocation, setBusinessLocation] = useState<any>(null);

  // Fetch business location if this is a business account
  React.useEffect(() => {
    const fetchBusinessLocation = async () => {
      if (!hasValidBusinessAccount || !businessProfile) return;
      
      try {
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
            setBusinessLocation(location);
            // Auto-set location for business posts
            setSelectedLocation({
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
            });
            setSelectedCategory(location.category);
          }
        }
      } catch (error) {
        console.error('Error fetching business location:', error);
      }
    };

    fetchBusinessLocation();
  }, [hasValidBusinessAccount, businessProfile]);

  const handleFilesSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    const newFiles = validFiles.slice(0, 5 - selectedFiles.length);
    
    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      
      newFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviewUrls(prev => [...prev, url]);
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleLocationSelect = (location: any) => {
    // Prevent location change if business account
    if (hasValidBusinessAccount && businessLocation) {
      toast.info(t('locationLockedToBusiness', { ns: 'business' }));
      return;
    }

    if (location === null) {
      setSelectedLocation(null);
      setSelectedCategory('');
      return;
    }

    // Extract coordinates - OSM provides coordinates.lat/lng, Google provides geometry.location.lat()/lng()
    const lat = location.coordinates?.lat ?? location.lat ?? location.geometry?.location?.lat?.();
    const lng = location.coordinates?.lng ?? location.lng ?? location.geometry?.location?.lng?.();
    
    console.log('📍 Location selected:', location.name, 'coordinates:', { lat, lng });

    // Auto-detect category from place types
    const types = location.types || [];
    let category = 'place';
    
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

    console.log('🏷️ Auto-detected category:', category, 'from types:', types);
    setSelectedCategory(category);

    setSelectedLocation({
      place_id: location.id || `osm_${Date.now()}`,
      name: location.name,
      formatted_address: location.address,
      city: location.city,
      geometry: {
        location: {
          lat: () => lat,
          lng: () => lng
        }
      },
      types: location.types || []
    });
  };

  const uploadFiles = async (): Promise<string[]> => {
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
  };

  const handleSubmit = async () => {
    if (!user || !selectedLocation || !selectedCategory) {
      toast.error(t('selectLocationAndCategory', { ns: 'add' }));
      return;
    }

    setIsUploading(true);
    
    try {
      console.log('🚀 Starting post creation...');
      
      // Upload media files
      const mediaUrls = await uploadFiles();
      console.log('✅ Media uploaded:', mediaUrls.length, 'files');
      
      // Find or create location
      let locationId = null;
      const lat = selectedLocation.geometry?.location?.lat?.();
      const lng = selectedLocation.geometry?.location?.lng?.();
      
      console.log('📍 Location coordinates:', { lat, lng, name: selectedLocation.name });
      
      // STRATEGY 1: Check by coordinates first (most reliable)
      if (lat != null && lng != null) {
        const threshold = 0.0001; // ~11 meters
        const { data: nearbyLocs } = await supabase
          .from('locations')
          .select('id, name')
          .gte('latitude', lat - threshold)
          .lte('latitude', lat + threshold)
          .gte('longitude', lng - threshold)
          .lte('longitude', lng + threshold)
          .limit(1);
        
        if (nearbyLocs && nearbyLocs.length > 0) {
          locationId = nearbyLocs[0].id;
          console.log('✅ Found existing location by coordinates:', nearbyLocs[0].name);
        }
      }
      
      // STRATEGY 2: Check by name (fallback) - prefer locations with coordinates
      if (!locationId) {
        const { data: nameLocs } = await supabase
          .from('locations')
          .select('id, name, latitude, longitude')
          .ilike('name', selectedLocation.name)
          .not('latitude', 'is', null)
          .limit(1);
        
        if (nameLocs && nameLocs.length > 0) {
          locationId = nameLocs[0].id;
          console.log('✅ Found existing location by name:', nameLocs[0].name);
        }
      }
      
      // Create new location if not found - only if we have valid coordinates
      if (!locationId) {
        if (lat == null || lng == null) {
          console.error('❌ Cannot create location without coordinates');
          toast.error(t('invalidLocation', { ns: 'add' }));
          setIsUploading(false);
          return;
        }
        
        console.log('🆕 Creating new location with coordinates:', lat, lng);
        
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
        
        if (locationError) {
          console.error('❌ Location error:', locationError);
          throw locationError;
        }
        
        locationId = newLocation.id;
        console.log('✅ Created new location:', locationId);
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
      
      if (postError) {
        console.error('❌ Post error:', postError);
        throw postError;
      }
      
      console.log('✅ Post created successfully!', post.id);
      
      toast.success(t('postShared', { ns: 'add' }));
      
      // Clean up
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Navigate to home page after successful post
      navigate('/');
      
    } catch (error) {
      console.error('❌ Error creating post:', error);
      toast.error(t('errorCreating', { ns: 'add' }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleUserTagged = (user: any) => {
    setTaggedUsers(prev => [...prev, user]);
  };

  const handleUserRemoved = (userId: string) => {
    setTaggedUsers(prev => prev.filter(u => u.id !== userId));
  };

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
      onRemoveFile={handleRemoveFile}
      onCaptionChange={setCaption}
      onLocationSelect={handleLocationSelect}
      onCategoryChange={setSelectedCategory}
      onUserTagged={handleUserTagged}
      onUserRemoved={handleUserRemoved}
      onRatingChange={hasValidBusinessAccount ? undefined : setRating}
      onSubmit={handleSubmit}
      isBusinessAccount={hasValidBusinessAccount}
    />
  );
};
