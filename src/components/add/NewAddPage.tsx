import React, { useState } from 'react';
import { PostEditor } from './PostEditor';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const NewAddPage = () => {
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

  const handleFilesSelect = (files: FileList) => {
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
      place_id: location.place_id,
      name: location.name,
      formatted_address: location.address,
      geometry: {
        location: {
          lat: () => location.lat,
          lng: () => location.lng
        }
      },
      types: location.types
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
      toast.error('Please select a location and category');
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
      
      // Check if location exists by google_place_id
      if (selectedLocation.place_id) {
        const { data: existing } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', selectedLocation.place_id)
          .maybeSingle();
        
        if (existing) {
          locationId = existing.id;
          console.log('✅ Found existing location:', locationId);
        }
      }
      
      // Create new location if not found
      if (!locationId) {
        console.log('🆕 Creating new location...');
        
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            google_place_id: selectedLocation.place_id,
            name: selectedLocation.name,
            address: selectedLocation.formatted_address,
            latitude: selectedLocation.geometry?.location?.lat(),
            longitude: selectedLocation.geometry?.location?.lng(),
            category: selectedCategory,
            place_types: selectedLocation.types || [],
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
      
      toast.success('Post shared successfully!');
      
      // Clean up
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Navigate to explore page to show the new post
      navigate('/explore');
      
    } catch (error) {
      console.error('❌ Error creating post:', error);
      toast.error('Failed to share post. Please try again.');
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
