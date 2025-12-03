import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { getCategoryImage } from '@/utils/categoryIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { mapGooglePlaceTypeToCategory, isAllowedNominatimType } from '@/utils/allowedCategories';
import PinDetailCard from '@/components/explore/PinDetailCard';

interface NearbyLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  distance: number;
  coordinates: { lat: number; lng: number };
  category?: string;
  isExisting?: boolean;
}

const SaveLocationPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { t: tNav } = useTranslation('navigation');
  const { user } = useAuth();
  const { location, loading: geoLoading } = useGeolocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NearbyLocation[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Fetch nearby locations
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      fetchNearbyLocations();
    }
  }, [location]);

  const fetchNearbyLocations = async () => {
    if (!location) return;
    
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(100);

      if (error) throw error;

      const withDistance = data?.map(loc => {
        const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
        const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
        const distance = calculateDistance(
          location.latitude!,
          location.longitude!,
          lat,
          lng
        );
        return {
          id: loc.id,
          name: loc.name,
          address: loc.address || '',
          city: loc.city || '',
          distance,
          coordinates: { lat, lng },
          category: loc.category,
          isExisting: true
        };
      }) || [];

      const nearby = withDistance
        .filter(loc => loc.distance <= 500)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      setNearbyLocations(nearby);
    } catch (error) {
      console.error('Error fetching nearby locations:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);
    
    if (s1 === s2) return 1.0;
    if (s2.includes(s1) || s1.includes(s2)) {
      const longer = Math.max(s1.length, s2.length);
      const shorter = Math.min(s1.length, s2.length);
      return shorter / longer * 0.95;
    }
    
    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength);
  };

  const calculateRelevanceScore = (
    query: string, 
    name: string, 
    address: string, 
    distance: number
  ): number => {
    const nameSimilarity = calculateSimilarity(query, name);
    const addressSimilarity = calculateSimilarity(query, address);
    
    let bestSimilarity = nameSimilarity;
    
    const normalizedQuery = normalizeString(query);
    const normalizedName = normalizeString(name);
    if (normalizedName === normalizedQuery) {
      bestSimilarity = 1.0;
    } else if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
      bestSimilarity = Math.max(bestSimilarity, 0.95);
    }
    
    bestSimilarity = Math.max(bestSimilarity, addressSimilarity * 0.5);
    
    const distanceFactor = distance === Infinity ? 0.3 : Math.max(0, 1 - (distance / 500));
    
    return bestSimilarity * 0.85 + distanceFactor * 0.15;
  };

  // Format address to avoid repetition: Row 1 = Name, Row 2 = city, street, number
  const formatDisplayAddress = (name: string, address: string, city: string): string => {
    if (!address && !city) return '';
    
    // Remove the name from the address if it appears at the beginning
    let cleanAddress = address || '';
    const normalizedName = name.toLowerCase().trim();
    
    if (cleanAddress.toLowerCase().startsWith(normalizedName)) {
      cleanAddress = cleanAddress.substring(name.length).replace(/^[,\s]+/, '');
    }
    
    // Parse address components
    const parts = cleanAddress.split(',').map(p => p.trim()).filter(Boolean);
    
    // Try to identify street+number (usually has numbers)
    const streetParts: string[] = [];
    const otherParts: string[] = [];
    
    for (const part of parts) {
      // Skip if it's just a postal code or very short
      if (/^\d{4,}/.test(part) || part.length < 3) continue;
      // Skip if it matches the name or city
      if (part.toLowerCase() === normalizedName) continue;
      if (city && part.toLowerCase() === city.toLowerCase()) continue;
      
      // If has house number pattern, it's likely street
      if (/\d+[-–]?\d*$/.test(part) || /^\d+/.test(part)) {
        streetParts.push(part);
      } else {
        otherParts.push(part);
      }
    }
    
    // Build result: city first, then street with number
    const result: string[] = [];
    if (city) result.push(city);
    else if (otherParts.length > 0) result.push(otherParts[0]);
    
    if (streetParts.length > 0) result.push(streetParts[0]);
    else if (otherParts.length > (city ? 0 : 1)) result.push(otherParts[city ? 0 : 1]);
    
    return result.join(', ') || parts.slice(0, 2).join(', ');
  };

  const searchLocations = async (query: string) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const userLat = location?.latitude;
      const userLng = location?.longitude;
      
      const { data: appLocations, error } = await supabase
        .from('locations')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(100);

      if (error) throw error;

      let existingResults: NearbyLocation[] = appLocations?.map(loc => {
        const latRaw = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
        const lngRaw = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
        const hasCoords = typeof latRaw === 'number' && typeof lngRaw === 'number';

        const distance = userLat && userLng && hasCoords
          ? calculateDistance(userLat, userLng, latRaw, lngRaw)
          : Infinity;
        
        const relevance = calculateRelevanceScore(
          query,
          loc.name,
          loc.address || loc.city || '',
          distance
        );
        
        return {
          id: loc.id,
          name: loc.name,
          address: loc.address || '',
          city: loc.city || '',
          coordinates: { lat: hasCoords ? latRaw : 0, lng: hasCoords ? lngRaw : 0 },
          distance,
          category: loc.category,
          isExisting: true,
          relevance
        };
      }).filter((r: any) => r.relevance >= 0.5)
        .sort((a: any, b: any) => b.relevance - a.relevance)
        .slice(0, 10) || [];

      // Search Nominatim for new locations
      const userLoc = userLat && userLng 
        ? { lat: userLat, lng: userLng }
        : undefined;
        
      const nominatimResults = await nominatimGeocoding.searchPlace(query, 'en', userLoc);
      
      const filteredNominatim = nominatimResults?.filter(r => {
        return isAllowedNominatimType(r.type, r.class);
      }) || [];
      
      const newLocationResults = filteredNominatim.map(r => {
        const distance = userLat && userLng 
          ? calculateDistance(userLat, userLng, r.lat, r.lng)
          : Infinity;
        const relevance = calculateRelevanceScore(query, r.displayName, r.address, distance);
        
        // Extract name from displayName (first part before comma)
        const namePart = r.displayName.split(',')[0].trim();
        
        return {
          id: `osm-${r.lat}-${r.lng}`,
          name: namePart,
          address: r.address || r.displayName,
          city: r.city || '',
          coordinates: { lat: r.lat, lng: r.lng },
          distance,
          category: r.type || 'restaurant',
          isExisting: false,
          relevance
        };
      }).filter((r: any) => 
        r.relevance >= 0.5 && 
        !existingResults.some(existing => 
          Math.abs(existing.coordinates.lat - r.coordinates.lat) < 0.001 && 
          Math.abs(existing.coordinates.lng - r.coordinates.lng) < 0.001
        )
      ) || [];

      let results = [...existingResults, ...newLocationResults]
        .sort((a: any, b: any) => (b as any).relevance - (a as any).relevance)
        .slice(0, 20);

      // Remove duplicates by normalized name + rounded coordinates (4 decimal places = ~11m precision)
      const seen = new Map<string, any>();
      results = results.filter(result => {
        // Create key from normalized name + rounded coordinates
        const normalizedName = normalizeString(result.name.split(',')[0]);
        const roundedLat = result.coordinates.lat.toFixed(4);
        const roundedLng = result.coordinates.lng.toFixed(4);
        const coordKey = `${normalizedName}|${roundedLat},${roundedLng}`;
        
        // Also check just coordinates with less precision for same location different names
        const looseCoordKey = `${result.coordinates.lat.toFixed(3)},${result.coordinates.lng.toFixed(3)}`;
        
        if (seen.has(coordKey) || seen.has(looseCoordKey)) {
          return false;
        }
        seen.set(coordKey, result);
        seen.set(looseCoordKey, result);
        return true;
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching locations:', error);
      toast.error(t('searchError', { defaultValue: 'Search error' }));
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocations(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = async (loc: NearbyLocation) => {
    // Check if location exists in database
    let locationToShow = null;
    
    if (loc.isExisting && loc.id && !loc.id.startsWith('osm-')) {
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('*')
        .eq('id', loc.id)
        .single();
      
      locationToShow = existingLocation;
    }
    
    // If location doesn't exist, create it
    if (!locationToShow) {
      const { data: newLocation, error } = await supabase
        .from('locations')
        .insert({
          name: loc.name,
          address: loc.address,
          latitude: loc.coordinates.lat,
          longitude: loc.coordinates.lng,
          category: loc.category || 'restaurant',
          city: loc.city,
          created_by: user?.id,
          pioneer_user_id: user?.id,
        })
        .select()
        .single();

      if (!error && newLocation) {
        locationToShow = newLocation;
      }
    }

    // Show PinDetailCard with the location
    setSelectedPlace({
      id: locationToShow?.id,
      google_place_id: locationToShow?.google_place_id,
      name: locationToShow?.name || loc.name,
      address: locationToShow?.address || loc.address,
      category: locationToShow?.category || loc.category || 'restaurant',
      city: locationToShow?.city || loc.city,
      coordinates: {
        lat: locationToShow?.latitude || loc.coordinates.lat,
        lng: locationToShow?.longitude || loc.coordinates.lng,
      },
    });
    
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  return (
    <>
      <div className="min-h-screen bg-background overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background pt-safe">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{tNav('addLocation', { defaultValue: 'Aggiungi luogo' })}</h1>
          </div>
        </div>

        <div className="p-4 space-y-6 pb-32 pb-safe">
          {/* Search Bar */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder={t('searchPlace', { defaultValue: 'Cerca un luogo...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="pl-10"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
            {isSearchFocused && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearchFocused(false);
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
              >
                {t('cancel')}
              </Button>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('searchResults')}</h3>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-2 scrollbar-hide">
                {searchResults.map((result, index) => (
                  <button
                    key={result.id || index}
                    onClick={() => handleSelectLocation(result)}
                    className="w-full text-left p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {result.category && (
                          <img 
                            src={getCategoryImage(result.category)} 
                            alt={result.category}
                            className="h-8 w-8 shrink-0 object-contain"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {formatDisplayAddress(result.name, result.address, result.city)}
                          </p>
                        </div>
                      </div>
                      {result.distance !== undefined && result.distance !== Infinity && (
                        <p className="text-xs text-muted-foreground shrink-0">{result.distance.toFixed(1)} km</p>
                      )}
                    </div>
                    {!result.isExisting && (
                      <p className="text-xs text-primary mt-1">{t('newLocationWillBeAdded')}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Locations - Only show if no search query */}
          {!searchQuery && nearbyLocations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{t('nearbyPlaces')}</h3>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-2 scrollbar-hide">
                {nearbyLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full text-left p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {loc.category && (
                          <img 
                            src={getCategoryImage(loc.category)} 
                            alt={loc.category}
                            className="h-8 w-8 shrink-0 object-contain"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{loc.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {formatDisplayAddress(loc.name, loc.address, loc.city)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{loc.distance.toFixed(1)} km</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PinDetailCard */}
      {selectedPlace && (
        <PinDetailCard
          place={selectedPlace}
          onClose={() => {
            setSelectedPlace(null);
            navigate(-1);
          }}
        />
      )}
    </>
  );
};

export default SaveLocationPage;