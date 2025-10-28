import React, { useState } from 'react';
import { PostEditor } from './PostEditor';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const NewAddPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [rating, setRating] = useState<number | undefined>();
  const [isUploading, setIsUploading] = useState(false);

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

      // Try to extract location from first image EXIF
      if (!selectedLocation && newFiles[0]?.type.startsWith('image/')) {
        try {
          const exifr = await import('exifr');
          const gps = await exifr.gps(newFiles[0]);
          if (gps?.latitude && gps?.longitude) {
            const { nominatimGeocoding } = await import('@/lib/nominatimGeocoding');
            const result = await nominatimGeocoding.reverseGeocode(gps.latitude, gps.longitude);
            if (result) {
              toast.success('Location detected from photo!');
              handleLocationSelect({
                id: `gps_${Date.now()}`,
                name: result.city || result.address.split(',')[0],
                address: result.address,
                lat: result.lat,
                lng: result.lng,
                types: ['locality']
              });
            }
          }
        } catch (err) {
          console.log('No GPS data in image');
        }
      }
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
    if (location === null) {
      setSelectedLocation(null);
      setSelectedCategory('');
      return;
    }

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
      geometry: {
        location: {
          lat: () => location.lat,
          lng: () => location.lng
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
      
      // Check if location exists by name and coordinates (since we don't have google_place_id)
      const { data: existing } = await supabase
        .from('locations')
        .select('id')
        .eq('name', selectedLocation.name)
        .eq('latitude', selectedLocation.geometry?.location?.lat())
        .eq('longitude', selectedLocation.geometry?.location?.lng())
        .maybeSingle();
      
      if (existing) {
        locationId = existing.id;
        console.log('✅ Found existing location:', locationId);
      }
      
      // Create new location if not found
      if (!locationId) {
        console.log('🆕 Creating new location...');
        
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            name: selectedLocation.name,
            address: selectedLocation.formatted_address,
            latitude: selectedLocation.geometry?.location?.lat(),
            longitude: selectedLocation.geometry?.location?.lng(),
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
      
      // Navigate to explore page to show the new post
      navigate('/explore');
      
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
      rating={rating}
      isUploading={isUploading}
      onFilesSelect={handleFilesSelect}
      onRemoveFile={handleRemoveFile}
      onCaptionChange={setCaption}
      onLocationSelect={handleLocationSelect}
      onCategoryChange={setSelectedCategory}
      onUserTagged={handleUserTagged}
      onUserRemoved={handleUserRemoved}
      onRatingChange={setRating}
      onSubmit={handleSubmit}
    />
  );
};
