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
import { formatSearchResultAddress } from '@/utils/addressFormatter';
import PinDetailCard from '@/components/explore/PinDetailCard';

interface NearbyLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  streetName?: string;
  streetNumber?: string;
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
      const lat = location.latitude!;
      const lng = location.longitude!;
      
      // Get ALL existing locations to filter them out
      const { data: existingLocations } = await supabase
        .from('locations')
        .select('name, latitude, longitude, city');
      
      const existingByCoords = new Set(
        existingLocations?.filter(loc => loc.latitude && loc.longitude).map(loc => 
          `${Number(loc.latitude).toFixed(4)}-${Number(loc.longitude).toFixed(4)}`
        ) || []
      );
      
      const existingByNameCity = new Set(
        existingLocations?.map(loc => 
          `${loc.name?.toLowerCase().trim()}-${loc.city?.toLowerCase().trim() || ''}`
        ) || []
      );
      
      // Search for POIs by category types around user location using q= parameter
      const searchTerms = ['restaurant', 'bar', 'cafe', 'pizza'];
      const allResults: any[] = [];
      
      // Fetch POIs for each search term (parallel)
      const searchPromises = searchTerms.map(async (term) => {
        const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&limit=15&bounded=1&viewbox=${lng - 0.03},${lat + 0.03},${lng + 0.03},${lat - 0.03}&addressdetails=1`;
        
        try {
          const response = await fetch(searchUrl, {
            headers: { 
              'Accept-Language': 'en',
              'User-Agent': 'SpottApp/1.0'
            }
          });
          const results = await response.json();
          return Array.isArray(results) ? results : [];
        } catch (e) {
          console.log(`Failed to fetch ${term}:`, e);
          return [];
        }
      });
      
      const searchResults = await Promise.all(searchPromises);
      searchResults.forEach(results => allResults.push(...results));
      
      const newLocations = allResults
        .filter((result: any) => {
          if (!result.name) return false;
          
          // Check if already exists by coordinates
          const coordKey = `${Number(result.lat).toFixed(4)}-${Number(result.lon).toFixed(4)}`;
          if (existingByCoords.has(coordKey)) return false;
          
          // Check if already exists by name + city
          const city = result.address?.city || result.address?.town || result.address?.village || '';
          const nameCityKey = `${result.name?.toLowerCase().trim()}-${city.toLowerCase().trim()}`;
          if (existingByNameCity.has(nameCityKey)) return false;
          
          return true;
        })
        .map((result: any) => {
          const resultLat = parseFloat(result.lat);
          const resultLng = parseFloat(result.lon);
          const distance = calculateDistance(lat, lng, resultLat, resultLng);
          
          return {
            id: `osm-${result.osm_id || result.place_id}`,
            name: result.name, // Use the actual POI name
            address: result.display_name || '',
            city: result.address?.city || result.address?.town || result.address?.village || '',
            streetName: result.address?.road || result.address?.street,
            streetNumber: result.address?.house_number,
            distance,
            coordinates: { lat: resultLat, lng: resultLng },
            category: result.type === 'pub' ? 'bar' : result.type || 'restaurant',
            isExisting: false
          };
        })
        .filter((loc: any) => loc.distance <= 3 && loc.name) // 3km radius
        .sort((a: any, b: any) => a.distance - b.distance);

      // Remove duplicates by name
      const seen = new Set<string>();
      const uniqueLocations = newLocations.filter(loc => {
        const key = loc.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 10);

      setNearbyLocations(uniqueLocations);
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

  // Normalize string for fuzzy matching - handles typos like "diceys" vs "dicey's" or "dizeys"
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Simple phonetic normalization for common letter substitutions
  const phoneticNormalize = (str: string): string => {
    return normalizeString(str)
      .replace(/z/g, 's')
      .replace(/ph/g, 'f')
      .replace(/ck/g, 'k')
      .replace(/ee/g, 'i')
      .replace(/ie/g, 'i')
      .replace(/ey/g, 'i')
      .replace(/y$/g, 'i');
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);
    
    if (s1 === s2) return 1.0;
    
    // Phonetic match
    const p1 = phoneticNormalize(str1);
    const p2 = phoneticNormalize(str2);
    if (p1 === p2) return 0.98;
    
    if (s2.includes(s1) || s1.includes(s2)) {
      const longer = Math.max(s1.length, s2.length);
      const shorter = Math.min(s1.length, s2.length);
      return shorter / longer * 0.95;
    }
    
    // Levenshtein distance
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
    const levenshteinScore = maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength);
    
    // Also check phonetic Levenshtein
    const pMatrix: number[][] = [];
    for (let i = 0; i <= p2.length; i++) {
      pMatrix[i] = [i];
    }
    for (let j = 0; j <= p1.length; j++) {
      pMatrix[0][j] = j;
    }
    
    for (let i = 1; i <= p2.length; i++) {
      for (let j = 1; j <= p1.length; j++) {
        if (p2.charAt(i - 1) === p1.charAt(j - 1)) {
          pMatrix[i][j] = pMatrix[i - 1][j - 1];
        } else {
          pMatrix[i][j] = Math.min(
            pMatrix[i - 1][j - 1] + 1,
            pMatrix[i][j - 1] + 1,
            pMatrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const pDistance = pMatrix[p2.length][p1.length];
    const pMaxLength = Math.max(p1.length, p2.length);
    const phoneticScore = pMaxLength === 0 ? 1.0 : 1.0 - (pDistance / pMaxLength);
    
    return Math.max(levenshteinScore, phoneticScore * 0.95);
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
    
    // Distance factor - strongly favor nearby locations
    let distanceFactor = 0.2;
    if (distance !== Infinity) {
      if (distance <= 5) {
        distanceFactor = 1.0;
      } else if (distance <= 50) {
        distanceFactor = 1.0 - ((distance - 5) / 45) * 0.6;
      } else if (distance <= 200) {
        distanceFactor = 0.4 - ((distance - 50) / 150) * 0.3;
      } else {
        distanceFactor = 0.1;
      }
    }
    
    // For high similarity, name is primary. For lower similarity, distance matters more
    if (bestSimilarity >= 0.8) {
      return bestSimilarity * 0.7 + distanceFactor * 0.3;
    } else {
      return bestSimilarity * 0.5 + distanceFactor * 0.5;
    }
  };

  // Enrich location with street address via reverse geocoding if missing
  const enrichAddressIfMissing = async (result: any): Promise<any> => {
    if (result.streetName || !result.coordinates?.lat || !result.coordinates?.lng) {
      return result;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { latitude: result.coordinates.lat, longitude: result.coordinates.lng, language: 'en' }
      });
      
      if (!error && data?.formatted_address) {
        const parts = data.formatted_address.split(',').map((p: string) => p.trim());
        if (parts.length > 0) {
          const streetPart = parts[0];
          const numberMatch = streetPart.match(/^(.+?)\s+(\d+[-–]?\d*)$/) || 
                             streetPart.match(/^(\d+[-–]?\d*)\s+(.+)$/);
          
          if (numberMatch) {
            if (/^\d/.test(numberMatch[1])) {
              result.streetNumber = numberMatch[1];
              result.streetName = numberMatch[2];
            } else {
              result.streetName = numberMatch[1];
              result.streetNumber = numberMatch[2];
            }
          } else {
            result.streetName = streetPart;
          }
        }
        if (data.city && !result.city) {
          result.city = data.city;
        }
      }
    } catch (e) {
      console.log('Address enrichment failed:', e);
    }
    
    return result;
  };

  // Format address wrapper using shared utility
  const formatDisplayAddress = (name: string, address: string, city: string, streetName?: string, streetNumber?: string): string => {
    return formatSearchResultAddress({ name, address, city, streetName, streetNumber });
  };

  const searchLocations = async (query: string) => {
    // Start searching with just 2 characters for better partial matching
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const userLat = location?.latitude;
      const userLng = location?.longitude;
      const normalizedQuery = query.toLowerCase().trim();
      
      // Get ALL existing locations to filter them out
      const { data: existingLocations } = await supabase
        .from('locations')
        .select('name, latitude, longitude, city');
      
      // Create sets for checking existing locations
      const existingByCoords = new Set(
        existingLocations?.filter(loc => loc.latitude && loc.longitude).map(loc => 
          `${Number(loc.latitude).toFixed(4)}-${Number(loc.longitude).toFixed(4)}`
        ) || []
      );
      
      const existingByNameCity = new Set(
        existingLocations?.map(loc => 
          `${loc.name?.toLowerCase().trim()}-${loc.city?.toLowerCase().trim() || ''}`
        ) || []
      );
      
      // Strategy: Search Nominatim for category-based POIs, then filter by name client-side
      // This works because Nominatim is better at finding POIs by category than partial name matching
      const allNominatimResults: any[] = [];
      
      // Search multiple relevant categories to find POIs, then filter by query
      const categorySearches = ['restaurant', 'bar', 'cafe', 'pizza', 'hotel', 'museum', 'nightclub', 'bakery'];
      
      if (userLat && userLng) {
        // Search for each category in parallel around user location
        const searchPromises = categorySearches.map(async (category) => {
          const viewbox = `${userLng - 0.1},${userLat + 0.1},${userLng + 0.1},${userLat - 0.1}`;
          const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(category)}&format=json&limit=30&viewbox=${viewbox}&addressdetails=1`;
          
          try {
            const response = await fetch(searchUrl, {
              headers: { 
                'Accept-Language': 'en',
                'User-Agent': 'SpottApp/1.0'
              }
            });
            const results = await response.json();
            return Array.isArray(results) ? results : [];
          } catch (e) {
            return [];
          }
        });
        
        const results = await Promise.all(searchPromises);
        results.forEach(r => allNominatimResults.push(...r));
      }
      
      // Also do a direct search with the query itself
      const userLoc = userLat && userLng ? { lat: userLat, lng: userLng } : undefined;
      const directResults = await nominatimGeocoding.searchPlace(query, 'en', userLoc);
      if (directResults) {
        allNominatimResults.push(...directResults.map(r => ({
          lat: String(r.lat),
          lon: String(r.lng),
          name: r.name,
          display_name: r.displayName,
          type: r.type,
          class: r.class,
          address: { city: r.city, road: r.streetName, house_number: r.streetNumber }
        })));
      }
      
      // Filter and deduplicate
      const filteredNominatim = allNominatimResults.filter(r => {
        const type = r.type?.toLowerCase() || '';
        const osmClass = r.class?.toLowerCase() || '';
        if (!isAllowedNominatimType(type, osmClass)) return false;
        
        // Use the proper name field from Nominatim
        const poiName = r.name || r.display_name?.split(',')[0].trim() || '';
        if (!poiName) return false;
        
        // Check if this location already exists by coordinates
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        const coordKey = `${lat.toFixed(4)}-${lng.toFixed(4)}`;
        if (existingByCoords.has(coordKey)) return false;
        
        // Check if this location already exists by name + city
        const city = r.address?.city || r.address?.town || r.address?.village || '';
        const nameCityKey = `${poiName.toLowerCase().trim()}-${city.toLowerCase().trim()}`;
        if (existingByNameCity.has(nameCityKey)) return false;
        
        // Filter by query - name must contain search term
        const normalizedName = poiName.toLowerCase();
        if (!normalizedName.includes(normalizedQuery)) return false;
        
        return true;
      });
      
      let results = filteredNominatim.map(r => {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        const distance = userLat && userLng 
          ? calculateDistance(userLat, userLng, lat, lng)
          : Infinity;
        
        // Use proper name from Nominatim
        const poiName = r.name || r.display_name?.split(',')[0].trim() || '';
        const city = r.address?.city || r.address?.town || r.address?.village || '';
        const streetName = r.address?.road || r.address?.street || r.address?.pedestrian || '';
        const streetNumber = r.address?.house_number || '';
        
        return {
          id: `osm-${lat}-${lng}`,
          name: poiName,
          address: r.display_name || '',
          city,
          streetName,
          streetNumber,
          coordinates: { lat, lng },
          distance,
          category: r.type || 'restaurant',
          isExisting: false
        };
      })
        // Sort by distance (proximity) - closest first
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 30);

      // Remove duplicates by normalized name + rounded coordinates
      const seen = new Map<string, any>();
      results = results.filter(result => {
        const normalizedName = normalizeString(result.name.split(',')[0]);
        const roundedLat = result.coordinates.lat.toFixed(4);
        const roundedLng = result.coordinates.lng.toFixed(4);
        const coordKey = `${normalizedName}|${roundedLat},${roundedLng}`;
        const looseCoordKey = `${result.coordinates.lat.toFixed(3)},${result.coordinates.lng.toFixed(3)}`;
        
        if (seen.has(coordKey) || seen.has(looseCoordKey)) {
          return false;
        }
        seen.set(coordKey, result);
        seen.set(looseCoordKey, result);
        return true;
      });

      // Enrich top 5 results with street addresses if missing
      const enrichedResults = await Promise.all(
        results.slice(0, 10).map(async (result, index) => {
          if (index < 5 && !result.streetName && result.coordinates?.lat && result.coordinates?.lng) {
            return enrichAddressIfMissing(result);
          }
          return result;
        })
      );
      
      results = [...enrichedResults, ...results.slice(10)];

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
    // DON'T create in database yet - only pass temporary data
    // Location will only be created when user clicks "Save" in PinDetailCard
    navigate('/', { 
      state: { 
        showLocationCard: true,
        locationData: {
          id: `temp-${Date.now()}`, // Temporary ID
          isTemporary: true, // Flag to indicate this needs to be created on save
          name: loc.name,
          address: loc.address,
          category: loc.category || 'restaurant',
          city: loc.city,
          streetName: loc.streetName,
          streetNumber: loc.streetNumber,
          coordinates: {
            lat: loc.coordinates.lat,
            lng: loc.coordinates.lng,
          },
        },
        returnTo: '/save-location'
      }
    });
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
                            {formatDisplayAddress(result.name, result.address, result.city, result.streetName, result.streetNumber)}
                          </p>
                        </div>
                      </div>
                      {result.distance !== undefined && result.distance !== Infinity && (
                        <p className="text-xs text-muted-foreground shrink-0">{result.distance.toFixed(1)} km</p>
                      )}
                    </div>
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
                            {formatDisplayAddress(loc.name, loc.address, loc.city, loc.streetName, loc.streetNumber)}
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