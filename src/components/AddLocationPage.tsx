
import { useState, useEffect } from 'react';
import { MapPin, Camera, Plus, X, Search, ChevronDown, Navigation } from 'lucide-react';
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Fixed */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">Share Your Experience</h1>
          <p className="text-gray-500 text-xs mt-1">Add photos and tell us about this place</p>
        </div>
      </div>

      {/* Main Content - Fixed Height */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Location Selection - Compact Dropdown */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPin className="w-3 h-3 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Where are you?</h3>
            {userLocation && (
              <div className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Navigation className="w-2 h-2" />
                <span>Located</span>
              </div>
            )}
          </div>
          
          <Popover open={showLocationSearch} onOpenChange={setShowLocationSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-10 text-left"
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <span className="flex items-center gap-2 text-gray-500">
                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Finding places...
                  </span>
                ) : selectedLocation ? (
                  <span className="text-gray-900">{selectedLocation}</span>
                ) : (
                  <span className="text-gray-500">Choose a location</span>
                )}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-3 space-y-2">
                {locationError && (
                  <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    {locationError}
                  </div>
                )}
                
                {userLocation && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-2 rounded-lg border border-green-200 mb-2">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-medium text-green-900">Places near you</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {nearbyPlaces.map((location, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedLocation(location);
                        setShowLocationSearch(false);
                      }}
                      className="w-full text-left p-2 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center",
                          index === 0 && userLocation ? "bg-green-100" : "bg-blue-100"
                        )}>
                          {index === 0 && userLocation ? (
                            <Navigation className="w-3 h-3 text-green-600" />
                          ) : (
                            <MapPin className="w-3 h-3 text-blue-600" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-900">{location}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <Input
                      placeholder="Search for a place..."
                      className="pl-7 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {selectedLocation && (
            <button
              onClick={() => setSelectedLocation('')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear selection
            </button>
          )}
        </div>

        {/* Photo Upload - Compact */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <Camera className="w-3 h-3 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Add Photos</h3>
            {uploadedImages.length > 0 && (
              <div className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {uploadedImages.length === 0 ? (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-blue-100 transition-all">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Add photos</span>
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
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <label className="flex items-center justify-center w-full h-10 border border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="flex items-center gap-2">
                  <Plus className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Add more</span>
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

        {/* Caption - Compact */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-xs font-bold">✨</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Tell us about it</h3>
            <span className="text-xs text-gray-500">(optional)</span>
          </div>
          <Textarea
            placeholder="What made this place special?"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[60px] resize-none text-xs"
          />
        </div>
      </div>

      {/* Fixed Post Button */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <Button
          onClick={handlePost}
          disabled={!canPost}
          className={cn(
            "w-full h-12 font-semibold rounded-xl transition-all",
            canPost 
              ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {canPost ? (
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Share Experience
            </span>
          ) : (
            "Select location & add photos"
          )}
        </Button>
      </div>
    </div>
  );
};

export default AddLocationPage;
