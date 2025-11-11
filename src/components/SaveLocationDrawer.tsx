import { useState, useRef, useEffect } from 'react';
import { MapPin, X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { locationService } from '@/services/locationService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';

interface SaveLocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSaved?: () => void;
  initialCoordinates?: { lat: number; lng: number };
}

interface PlaceResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category?: string;
}

const SaveLocationDrawer = ({ isOpen, onClose, onLocationSaved, initialCoordinates }: SaveLocationDrawerProps) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const categories = [
    'restaurant',
    'bar',
    'cafe',
    'bakery',
    'hotel',
    'museum',
    'entertainment',
  ];

  // Search for places when query changes
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await nominatimGeocoding.searchPlace(searchQuery, i18n.language);
        const mappedResults: PlaceResult[] = results.map(result => ({
          name: result.city || result.displayName.split(',')[0],
          displayName: result.displayName,
          lat: result.lat,
          lng: result.lng,
        }));
        setSearchResults(mappedResults);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, i18n.language]);

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setSearchQuery(place.name);
    setSearchResults([]);
    searchInputRef.current?.blur();
  };

  const handleSave = async () => {
    if (!selectedPlace || !category) {
      toast({
        title: t('error', { ns: 'common' }),
        description: t('saveLocation.selectLocationAndCategory', { ns: 'common' }),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await locationService.saveLocation({
        name: selectedPlace.name,
        category: category,
        address: selectedPlace.displayName,
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lng,
      });

      if (result) {
        toast({
          title: t('locationSaved', { ns: 'common' }),
          description: t('saveLocation.locationSavedDesc', { ns: 'common', name: selectedPlace.name }),
        });
        onLocationSaved?.();
        onClose();
        // Reset form
        setSearchQuery('');
        setSelectedPlace(null);
        setCategory('');
      } else {
        throw new Error('Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: t('error', { ns: 'common' }),
        description: t('saveLocation.failedToSave', { ns: 'common' }),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedPlace(null);
    setCategory('');
    setSearchResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[3000] flex items-end justify-center"
      onClick={handleClose}
    >
      <div 
        className="bg-background rounded-t-3xl w-full max-w-2xl shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t('saveLocation.title', { ns: 'common' })}
            </h2>
          </div>
          <button 
            onClick={handleClose} 
            className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Search Location */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('saveLocation.locationName', { ns: 'common' })} *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsFocused(false), 200);
                }}
                placeholder={t('saveLocation.searchPlaceholder', { ns: 'common' })}
                className="w-full pl-10 pr-20 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />
              {isSearching && (
                <Loader2 className="absolute right-16 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
              )}
              {isFocused && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    searchInputRef.current?.blur();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-2"
                >
                  {t('cancel', { ns: 'common' })}
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-card border border-border rounded-xl max-h-[200px] overflow-y-auto">
                {searchResults.map((place, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPlace(place)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{place.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {place.displayName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="mt-2 text-sm text-muted-foreground text-center py-4">
                {t('saveLocation.noPlacesFound', { ns: 'common' })}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('saveLocation.category', { ns: 'common' })} *
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full h-12 bg-muted/50 border-border">
                <SelectValue placeholder={t('saveLocation.selectCategory', { ns: 'common' })} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`categories.${cat}`, { ns: 'common' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Place Info */}
          {selectedPlace && (
            <div className="p-4 bg-primary/5 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">
                {t('saveLocation.selectedLocation', { ns: 'common' })}
              </p>
              <p className="text-sm font-medium text-foreground">
                {selectedPlace.displayName}
              </p>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isLoading || !selectedPlace || !category}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('saveLocation.saving', { ns: 'common' })}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('saveLocation.save', { ns: 'common' })}
              </span>
            )}
          </Button>

          {/* Tip */}
          <div className="p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground">
              💡 {t('saveLocation.tip', { ns: 'common' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveLocationDrawer;