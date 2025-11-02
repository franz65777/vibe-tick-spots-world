import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Image, MapPin, Loader2, Upload, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import OpenStreetMapAutocomplete from './OpenStreetMapAutocomplete';
import { useStories } from '@/hooks/useStories';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { extractImageMetadata, getLocationFromCoordinates } from '@/utils/imageUtils';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

// Image filters similar to Instagram
const imageFilters = [
  { id: 'normal', name: 'Normal', filter: 'none' },
  { id: 'clarendon', name: 'Clarendon', filter: 'contrast(1.2) saturate(1.35)' },
  { id: 'gingham', name: 'Gingham', filter: 'brightness(1.05) hue-rotate(-10deg)' },
  { id: 'moon', name: 'Moon', filter: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { id: 'lark', name: 'Lark', filter: 'contrast(0.9) saturate(1.5)' },
  { id: 'reyes', name: 'Reyes', filter: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { id: 'juno', name: 'Juno', filter: 'contrast(1.2) brightness(1.1) saturate(1.4) sepia(0.2)' },
  { id: 'slumber', name: 'Slumber', filter: 'saturate(0.66) brightness(1.05)' },
  { id: 'crema', name: 'Crema', filter: 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9) hue-rotate(-2deg)' },
  { id: 'ludwig', name: 'Ludwig', filter: 'brightness(1.05) saturate(2)' },
];

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const { uploadStory, uploading } = useStories();
  const { savedPlaces } = useSavedPlaces();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [location, setLocation] = useState<{
    place_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'details'>('upload');
  const [autoDetectingLocation, setAutoDetectingLocation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-open file picker when modal opens
  useEffect(() => {
    if (isOpen && step === 'upload') {
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  // Flatten saved places for selection
  const allSavedPlaces = Object.values(savedPlaces).flat();
  const filteredSavedPlaces = locationSearch 
    ? allSavedPlaces.filter(place => 
        place.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        place.city?.toLowerCase().includes(locationSearch.toLowerCase())
      )
    : allSavedPlaces;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Auto-detect location from image metadata
      if (file.type.startsWith('image/')) {
        setAutoDetectingLocation(true);
        try {
          const metadata = await extractImageMetadata(file);
          if (metadata.location) {
            const locationName = await getLocationFromCoordinates(
              metadata.location.latitude,
              metadata.location.longitude
            );
            
            if (locationName) {
              setLocation({
                place_id: '',
                name: locationName,
                address: locationName,
                lat: metadata.location.latitude,
                lng: metadata.location.longitude
              });
            }
          }
        } catch (error) {
          console.error('Error detecting location from image:', error);
        } finally {
          setAutoDetectingLocation(false);
        }
      }
      
      setStep('details');
    }
  };

  const handleLocationSelect = (place: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    city: string;
  }) => {
    setLocation({
      place_id: `osm-${place.coordinates.lat}-${place.coordinates.lng}`,
      name: place.name,
      address: place.address,
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
    });
    setShowLocationPicker(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !location) {
      toast({
        variant: "destructive",
        description: t('mustTagLocation', { ns: 'common' }) || 'Please select a location for your story',
      });
      return;
    }

    try {
      toast({
        description: t('publishing', { ns: 'common' }) || 'Publishing your story...',
      });
      
      await uploadStory(
        selectedFile,
        '',
        location?.place_id,
        location?.name,
        location?.address
      );
      
      toast({
        description: t('storyShared', { ns: 'common' }) || 'Story shared successfully!',
      });
      
      onStoryCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        variant: "destructive",
        description: 'Failed to create story. Please try again.',
      });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setLocation(null);
    setStep('upload');
    setSelectedFilter('normal');
    setAutoDetectingLocation(false);
    setShowLocationPicker(false);
    setLocationSearch('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentFilter = imageFilters.find(f => f.id === selectedFilter)?.filter || 'none';

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-r from-primary via-purple-600 to-blue-600 shadow-lg">
        <h3 className="font-bold text-xl text-white">
          {t('createStory', { ns: 'common' })}
        </h3>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white/20 h-10 w-10 text-white"
          disabled={uploading}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {step === 'upload' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="mb-8">
              <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                <Upload className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <h4 className="text-2xl font-bold text-foreground mb-3">
              {t('shareLocationMoments', { ns: 'common' })}
            </h4>
            <p className="text-muted-foreground text-base mb-8">
              {t('photosVideosAdventures', { ns: 'common' })}
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white py-4 px-6 rounded-2xl font-semibold transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <Image className="w-5 h-5" />
                {t('chooseFromGallery', { ns: 'common' })}
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-card hover:bg-accent text-foreground py-4 px-6 rounded-2xl font-semibold transition-all border-2 border-border flex items-center justify-center gap-3"
              >
                <Camera className="w-5 h-5" />
                {t('takePhoto', { ns: 'common' })}
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="mt-6 text-sm text-muted-foreground">
              {t('supportedFormats', { ns: 'common' })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview with Filter */}
          <div className="relative bg-black flex-shrink-0" style={{ height: '50vh' }}>
            {previewUrl && (
              selectedFile?.type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: currentFilter }}
                />
              ) : (
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              )
            )}

            {/* Filter selector - only for images */}
            {selectedFile?.type.startsWith('image/') && (
              <div className="absolute bottom-4 left-0 right-0 px-4">
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {imageFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className="flex-shrink-0"
                      >
                        <div className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedFilter === filter.id 
                            ? 'border-white scale-110 shadow-lg' 
                            : 'border-white/30'
                        }`}>
                          <img
                            src={previewUrl}
                            alt={filter.name}
                            className="w-full h-full object-cover"
                            style={{ filter: filter.filter }}
                          />
                        </div>
                        <p className={`text-xs mt-1 text-center font-medium ${
                          selectedFilter === filter.id ? 'text-white' : 'text-white/70'
                        }`}>
                          {filter.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Details Form */}
          <div className="flex-1 p-6 space-y-5 overflow-y-auto bg-background">
            <div>
                <label className="block text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {t('location', { ns: 'common' })} <span className="text-destructive">*</span>
                  {autoDetectingLocation && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                </label>
                
                {!location ? (
                  <div className="space-y-4">
                    {/* Saved Places */}
                    {allSavedPlaces.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-foreground">{t('yourSavedPlaces', { ns: 'common' })}</span>
                          <button
                            onClick={() => setShowLocationPicker(!showLocationPicker)}
                            className="text-sm text-primary hover:text-primary/80 font-medium"
                          >
                            {showLocationPicker ? t('hide', { ns: 'common' }) : t('showAll', { ns: 'common' })}
                          </button>
                        </div>
                        
                        {showLocationPicker && (
                          <div className="mb-4">
                            <div className="relative">
                              <Input
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                placeholder={t('searchYourPlaces', { ns: 'common' })}
                                className="pl-10 h-12 rounded-xl border-2 text-base"
                              />
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            </div>
                            <ScrollArea className="h-48 mt-3 border-2 rounded-xl">
                              {filteredSavedPlaces.length > 0 ? (
                                <div className="p-3 space-y-2">
                                  {filteredSavedPlaces.slice(0, 10).map((place) => (
                                    <button
                                      key={place.id}
                                      onClick={() => {
                                        setLocation({
                                          place_id: place.id,
                                          name: place.name,
                                          address: place.city || '',
                                          lat: place.coordinates.lat,
                                          lng: place.coordinates.lng,
                                        });
                                        setShowLocationPicker(false);
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-accent rounded-xl transition-colors"
                                    >
                                      <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-base text-foreground truncate">{place.name}</p>
                                          {place.category && (
                                            <p className="text-sm text-muted-foreground truncate">{place.category}</p>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-6 text-center text-base text-muted-foreground">
                                  {t('noSavedPlacesFound', { ns: 'common' })}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Search New Location */}
                    <div>
                      <span className="text-sm font-semibold text-foreground block mb-3">{t('orSearchNewLocation', { ns: 'common' })}</span>
                      <OpenStreetMapAutocomplete
                        onPlaceSelect={handleLocationSelect}
                        placeholder={t('searchForPlace', { ns: 'common' })}
                        className="rounded-xl border-2 h-12 text-base"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-primary/10 rounded-2xl border-2 border-primary/20">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-base truncate">{location.name}</p>
                        <p className="text-muted-foreground text-sm truncate">{location.address}</p>
                      </div>
                      <button
                        onClick={() => setLocation(null)}
                        className="text-primary hover:text-primary/80"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t-2 border-border flex gap-4 bg-background">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex-1 rounded-2xl border-2 h-14 text-base font-semibold"
                disabled={uploading}
              >
                {t('back', { ns: 'common' })}
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-2xl shadow-lg h-14 text-base font-semibold disabled:opacity-50"
                disabled={uploading || !location}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('publishing', { ns: 'common' })}
                  </>
                ) : (
                  t('shareStory', { ns: 'common' })
                )}
              </Button>
            </div>
          </div>
        )}
    </div>
  );
};

export default CreateStoryModal;
