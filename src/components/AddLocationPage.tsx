
import { useState, useEffect } from 'react';
import { MapPin, Camera, Plus, X, Search, ChevronRight, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <div className="bg-white px-4 py-4 border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Share Your Experience</h1>
          <p className="text-gray-500 text-sm mt-1">Add photos and tell us about this place</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6 pb-24">
            {/* Location Selection */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Where are you?</h3>
                {userLocation && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Navigation className="w-3 h-3" />
                    <span>Located</span>
                  </div>
                )}
              </div>
              
              {!selectedLocation ? (
                <div className="space-y-4">
                  {isLoadingLocation ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-600">Finding places near you...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {locationError && (
                        <div className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                          {locationError}
                        </div>
                      )}
                      
                      {userLocation && (
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Navigation className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-900">Places near you</span>
                          </div>
                          <p className="text-xs text-green-700">Based on your current location</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {nearbyPlaces.map((location, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSelectedLocation(location);
                              setShowLocationSearch(false);
                            }}
                            className="w-full text-left p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all border border-gray-100 hover:border-blue-200 group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                  index === 0 && userLocation ? "bg-green-100 group-hover:bg-green-200" : "bg-blue-100 group-hover:bg-blue-200"
                                )}>
                                  {index === 0 && userLocation ? (
                                    <Navigation className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 block">{location}</span>
                                  {index === 0 && userLocation && (
                                    <span className="text-xs text-green-600">Tap to use current location</span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="Or search for a different place..."
                            className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            onFocus={() => setShowLocationSearch(true)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-blue-900">{selectedLocation}</span>
                  </div>
                  <button
                    onClick={() => setSelectedLocation('')}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 hover:text-blue-800 shadow-sm hover:shadow-md transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Camera className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Add Photos</h3>
                {uploadedImages.length > 0 && (
                  <div className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    {uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              {uploadedImages.length === 0 ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-blue-100 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mb-4 group-hover:from-blue-200 group-hover:to-green-200 transition-all">
                      <Camera className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-gray-700 text-center">
                      <span className="font-semibold text-lg">📸 Capture the moment</span>
                      <br />
                      <span className="text-sm text-gray-500">Share what made this place special</span>
                    </p>
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
                          className="w-full h-36 object-cover rounded-xl border border-gray-200 shadow-sm"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-blue-700">Add more photos</span>
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
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-bold">✨</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Tell us about it</h3>
                <span className="text-sm text-gray-500">(optional)</span>
              </div>
              <Textarea
                placeholder="What made this place special? Share your experience, favorite dishes, or memorable moments..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[100px] resize-none border-gray-200 focus:border-purple-500 focus:ring-purple-500 placeholder:text-gray-400"
              />
              {caption.length > 0 && (
                <div className="mt-2 text-xs text-purple-600">
                  {caption.length} characters
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Post Button */}
      <div className="bg-white border-t border-gray-200 p-4 safe-area-pb flex-shrink-0">
        <Button
          onClick={handlePost}
          disabled={!canPost}
          className={cn(
            "w-full h-14 font-semibold text-lg rounded-xl transition-all shadow-sm",
            canPost 
              ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {canPost ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </div>
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
