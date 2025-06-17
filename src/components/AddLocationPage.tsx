
import { useState, useEffect } from 'react';
import { MapPin, Camera, Plus, X, Search, ChevronDown, Navigation, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLocationTagging } from '@/hooks/useLocationTagging';
import { usePostCreation } from '@/hooks/usePostCreation';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
  address?: string;
  category: string;
}

const AddLocationPage = () => {
  const navigate = useNavigate();
  const { 
    nearbyPlaces, 
    recentLocations, 
    userLocation, 
    loading: locationLoading,
    searchLocations,
    createNewLocation 
  } = useLocationTagging();
  const { createPost, uploading } = usePostCreation();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle location search
  const handleLocationSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchLocations(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce location search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleLocationSearch(locationSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [locationSearchQuery]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedImages(prev => [...prev, ...newFiles]);
      
      // Create preview URLs
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImagePreviewUrls(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setShowLocationSearch(false);
    setLocationSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateNewLocation = async () => {
    if (!locationSearchQuery.trim()) return;

    try {
      const newLocation = await createNewLocation({
        name: locationSearchQuery,
        category: 'other',
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        address: userLocation ? 'Current location' : undefined
      });

      if (newLocation) {
        handleLocationSelect(newLocation);
        toast.success('New location created successfully!');
      }
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error('Failed to create location');
    }
  };

  const handlePost = async () => {
    if (!selectedLocation || uploadedImages.length === 0) {
      toast.error('Please select a location and add at least one photo');
      return;
    }

    try {
      const result = await createPost({
        caption,
        locationId: selectedLocation.id,
        files: uploadedImages
      });

      if (result.success) {
        toast.success('Post created successfully!');
        navigate('/');
      } else {
        toast.error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const canPost = selectedLocation && uploadedImages.length > 0 && !uploading;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white pt-16">
      {/* Header - Fixed */}
      <div className="bg-white/95 backdrop-blur-lg px-6 py-3 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Share Your Experience</h1>
          <p className="text-gray-500 text-sm">Create memories that inspire others</p>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 pb-20">
          {/* Location Selection */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Where are you?</h3>
              {userLocation && (
                <div className="ml-auto flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <Navigation className="w-3 h-3" />
                  <span>Located</span>
                </div>
              )}
            </div>
            
            <Popover open={showLocationSearch} onOpenChange={setShowLocationSearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-12 text-left border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <span className="flex items-center gap-3 text-gray-500">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Finding places nearby...
                    </span>
                  ) : selectedLocation ? (
                    <span className="flex items-center gap-3 text-gray-900 font-medium">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {selectedLocation.name}
                    </span>
                  ) : (
                    <span className="text-gray-500">Choose a location to get started</span>
                  )}
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search for a place..."
                      value={locationSearchQuery}
                      onChange={(e) => setLocationSearchQuery(e.target.value)}
                      className="pl-10 h-10 text-sm"
                    />
                  </div>

                  {/* Search Results */}
                  {locationSearchQuery && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {isSearching ? (
                        <div className="text-center py-4">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((location) => (
                          <button
                            key={location.id}
                            onClick={() => handleLocationSelect(location)}
                            className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200"
                          >
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{location.name}</span>
                                {location.address && (
                                  <p className="text-xs text-gray-500">{location.address}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={handleCreateNewLocation}
                            className="w-full text-left p-3 bg-blue-50 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Plus className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">
                                Create "{locationSearchQuery}"
                              </span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nearby Places */}
                  {!locationSearchQuery && nearbyPlaces.length > 0 && (
                    <div className="space-y-2">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">Places near you</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {nearbyPlaces.map((place) => (
                          <button
                            key={place.id}
                            onClick={() => handleLocationSelect(place)}
                            className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200"
                          >
                            <div className="flex items-center gap-3">
                              <Navigation className="w-4 h-4 text-green-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{place.name}</span>
                                <p className="text-xs text-gray-500">{place.address}</p>
                                {place.distance && (
                                  <p className="text-xs text-green-600">{place.distance.toFixed(1)} km away</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Locations */}
                  {!locationSearchQuery && recentLocations.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 px-1">Recent locations</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {recentLocations.map((location) => (
                          <button
                            key={location.id}
                            onClick={() => handleLocationSelect(location)}
                            className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200"
                          >
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-900">{location.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {selectedLocation && (
              <button
                onClick={() => setSelectedLocation(null)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear selection
              </button>
            )}
          </div>

          {/* Photo Upload */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Add Photos</h3>
              {uploadedImages.length > 0 && (
                <div className="ml-auto text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  {uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            {uploadedImages.length === 0 ? (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-blue-100 transition-all group">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Camera className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-blue-700">Add photos</span>
                    <p className="text-xs text-gray-500">Share what makes this place special</p>
                  </div>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-20 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <label className="flex items-center justify-center w-full h-10 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Add more photos</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Tell us about it</h3>
              <span className="text-sm text-gray-500">(optional)</span>
            </div>
            <Textarea
              placeholder="What made this place special? Share your experience..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[60px] resize-none text-sm border-2 border-gray-200 focus:border-purple-300 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Fixed Post Button */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4">
        <Button
          onClick={handlePost}
          disabled={!canPost}
          className={cn(
            "w-full h-12 font-semibold rounded-2xl transition-all text-base",
            canPost 
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating post...
            </span>
          ) : canPost ? (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Share Experience
            </span>
          ) : (
            "Select location & add photos to continue"
          )}
        </Button>
      </div>
    </div>
  );
};

export default AddLocationPage;
