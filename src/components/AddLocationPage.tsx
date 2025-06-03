
import { useState, useEffect } from 'react';
import { MapPin, Camera, Plus, X, Search, ChevronDown, Navigation, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const AddLocationPage = () => {
  console.log('AddLocationPage rendering...');
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<string[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState('');

  // Get user's current location and suggest nearby places
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        setIsLoadingLocation(true);
        setLocationError('');

        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser');
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          });
        });

        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Generate nearby places based on location (in a real app, this would use a places API)
        const mockNearbyPlaces = [
          'Current Location - Restaurant nearby',
          'Coffee shop you just visited',
          'Park you\'re at right now',
          'Shopping center nearby',
          'Your favorite local spot'
        ];
        
        setNearbyPlaces(mockNearbyPlaces);
        
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationError('Unable to get your location. You can still search manually.');
        
        // Fallback suggestions when location is not available
        const fallbackSuggestions = [
          'Restaurant Francesco - Downtown',
          'Central Park - New York',
          'Coffee Bean Café - Main St',
          'Museum of Art - Cultural District',
          'Beach Club - Santa Monica'
        ];
        setNearbyPlaces(fallbackSuggestions);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getCurrentLocation();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setUploadedImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = () => {
    console.log('Posting content:', {
      location: selectedLocation,
      images: uploadedImages,
      caption,
      userLocation
    });
    // TODO: Implement actual posting logic
  };

  const canPost = selectedLocation && uploadedImages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white pt-12">
      {/* Header - Fixed */}
      <div className="bg-white/95 backdrop-blur-lg px-6 py-4 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Share Your Experience</h1>
          <p className="text-gray-500 text-sm mt-1">Create memories that inspire others</p>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 pb-32">
          {/* Location Selection */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center gap-3 mb-4">
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
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? (
                    <span className="flex items-center gap-3 text-gray-500">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Finding places nearby...
                    </span>
                  ) : selectedLocation ? (
                    <span className="text-gray-900 font-medium">{selectedLocation}</span>
                  ) : (
                    <span className="text-gray-500">Choose a location to get started</span>
                  )}
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 space-y-3">
                  {locationError && (
                    <div className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                      {locationError}
                    </div>
                  )}
                  
                  {userLocation && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Places near you</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {nearbyPlaces.map((location, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedLocation(location);
                          setShowLocationSearch(false);
                        }}
                        className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            index === 0 && userLocation ? "bg-green-100" : "bg-blue-100"
                          )}>
                            {index === 0 && userLocation ? (
                              <Navigation className="w-4 h-4 text-green-600" />
                            ) : (
                              <MapPin className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{location}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search for a place..."
                        className="pl-10 h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {selectedLocation && (
              <button
                onClick={() => setSelectedLocation('')}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear selection
              </button>
            )}
          </div>

          {/* Photo Upload */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center gap-3 mb-4">
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
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-blue-100 transition-all group">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Camera className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <span className="text-base font-medium text-blue-700">Add photos</span>
                    <p className="text-sm text-gray-500 mt-1">Share what makes this place special</p>
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
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
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center gap-3 mb-4">
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
              className="min-h-[80px] resize-none text-sm border-2 border-gray-200 focus:border-purple-300 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Fixed Post Button */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-6">
        <Button
          onClick={handlePost}
          disabled={!canPost}
          className={cn(
            "w-full h-14 font-semibold rounded-2xl transition-all text-lg",
            canPost 
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {canPost ? (
            <span className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
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
