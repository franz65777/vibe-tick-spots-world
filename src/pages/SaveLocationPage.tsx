import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { loadingKeywordsTranslations, loadingKeywordKeys } from '@/i18n-loading-keywords';
import { getCategoryImage } from '@/utils/categoryIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { searchPhoton, calculateDistance } from '@/lib/photonGeocoding';
import { mapGooglePlaceTypeToCategory } from '@/utils/allowedCategories';
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
  
  // Only restore search query if explicitly returning from a location card
  const [searchQuery, setSearchQuery] = useState(() => {
    const shouldRestore = sessionStorage.getItem('saveLocationShouldRestoreSearch') === 'true';
    if (shouldRestore) {
      sessionStorage.removeItem('saveLocationShouldRestoreSearch');
      return sessionStorage.getItem('saveLocationSearchQuery') || '';
    }
    // Clear any stale search query
    sessionStorage.removeItem('saveLocationSearchQuery');
    return '';
  });
  const [searchResults, setSearchResults] = useState<NearbyLocation[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(() => {
    const shouldRestore = sessionStorage.getItem('saveLocationShouldRestoreSearch') === 'true';
    return shouldRestore && !!sessionStorage.getItem('saveLocationSearchQuery');
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [keywordIndex, setKeywordIndex] = useState(0);
  
  // Cache for existing locations to avoid repeated fetches
  const existingLocationsCache = React.useRef<{
    byCoords: Set<string>;
    byNameCity: Set<string>;
    loaded: boolean;
  }>({ byCoords: new Set(), byNameCity: new Set(), loaded: false });
  
  // Abort controller for search requests
  const searchAbortRef = React.useRef<AbortController | null>(null);

  // Get current language loading translations
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const loadingTranslations = useMemo(() => {
    const lang = (loadingKeywordsTranslations as any)[currentLang] || loadingKeywordsTranslations.en;
    return lang.loading;
  }, [currentLang]);

  // Cycle through keywords for loading animation
  useEffect(() => {
    if (!initialLoading) return;
    
    const interval = setInterval(() => {
      setKeywordIndex((prev) => (prev + 1) % loadingKeywordKeys.length);
    }, 800);
    
    return () => clearInterval(interval);
  }, [initialLoading]);
  
  // Load existing locations cache once
  useEffect(() => {
    const loadExistingLocations = async () => {
      if (existingLocationsCache.current.loaded) return;
      
      const { data: existingLocations } = await supabase
        .from('locations')
        .select('name, latitude, longitude, city');
      
      existingLocationsCache.current.byCoords = new Set(
        existingLocations?.filter(loc => loc.latitude && loc.longitude).map(loc => 
          `${Number(loc.latitude).toFixed(4)}-${Number(loc.longitude).toFixed(4)}`
        ) || []
      );
      
      existingLocationsCache.current.byNameCity = new Set(
        existingLocations?.map(loc => 
          `${loc.name?.toLowerCase().trim()}-${loc.city?.toLowerCase().trim() || ''}`
        ) || []
      );
      
      existingLocationsCache.current.loaded = true;
    };
    
    loadExistingLocations();
  }, []);

  // Fetch nearby locations
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      fetchNearbyLocations();
    }
  }, [location]);

  const fetchNearbyLocations = async () => {
    if (!location) return;
    
    setInitialLoading(true);
    try {
      const lat = location.latitude!;
      const lng = location.longitude!;
      
      // Use cached existing locations
      const existingByCoords = existingLocationsCache.current.byCoords;
      const existingByNameCity = existingLocationsCache.current.byNameCity;
      
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
            name: result.name,
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
    } finally {
      setInitialLoading(false);
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
    // Cancel any pending search
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    searchAbortRef.current = new AbortController();
    
    // Start searching with just 2 characters for better partial matching
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const userLat = location?.latitude;
      const userLng = location?.longitude;
      
      // Use cached existing locations instead of fetching every time
      const existingByCoords = existingLocationsCache.current.byCoords;
      const existingByNameCity = existingLocationsCache.current.byNameCity;
      
      // Use Photon API for fast search-as-you-type with partial matching
      const userLoc = userLat && userLng ? { lat: userLat, lng: userLng } : undefined;
      const photonResults = await searchPhoton(query, userLoc, 30);
      
      // Check if request was aborted
      if (searchAbortRef.current?.signal.aborted) return;
      
      // Filter out existing locations
      let results = photonResults
        .filter(r => {
          // Check if this location already exists by coordinates
          const coordKey = `${r.lat.toFixed(4)}-${r.lng.toFixed(4)}`;
          if (existingByCoords.has(coordKey)) return false;
          
          // Check if this location already exists by name + city
          const nameCityKey = `${r.name.toLowerCase().trim()}-${r.city.toLowerCase().trim()}`;
          if (existingByNameCity.has(nameCityKey)) return false;
          
          return true;
        })
        .map(r => ({
          id: r.id,
          name: r.name,
          address: r.displayAddress,
          city: r.city,
          streetName: r.streetName,
          streetNumber: r.streetNumber,
          coordinates: { lat: r.lat, lng: r.lng },
          distance: userLoc ? calculateDistance(userLoc.lat, userLoc.lng, r.lat, r.lng) : Infinity,
          category: r.category || 'restaurant',
          isExisting: false
        }));

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

      // Skip address enrichment for speed - Photon already provides addresses
      setSearchResults(results);
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
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
    // Save search query and mark for restoration when returning
    if (searchQuery) {
      sessionStorage.setItem('saveLocationSearchQuery', searchQuery);
      sessionStorage.setItem('saveLocationShouldRestoreSearch', 'true');
    }
    
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
            <Button variant="ghost" size="icon" onClick={() => {
              // Clear any search state and navigate home
              sessionStorage.removeItem('saveLocationSearchQuery');
              sessionStorage.removeItem('saveLocationShouldRestoreSearch');
              navigate('/');
            }}>
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
                  sessionStorage.removeItem('saveLocationSearchQuery');
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
                            className={`shrink-0 object-contain ${
                              result.category === 'restaurant' ? 'h-10 w-10' : 
                              result.category === 'hotel' ? 'h-9 w-9' : 'h-8 w-8'
                            }`}
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

          {/* Loading State */}
          {!searchQuery && initialLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">🔍 {loadingTranslations.findingNearbyPlaces}</p>
              <p className="text-xl font-semibold text-primary mt-3 transition-all duration-300">
                {loadingTranslations.keywords[loadingKeywordKeys[keywordIndex]]}
              </p>
            </div>
          )}

          {/* Nearby Locations - Only show if no search query and not loading */}
          {!searchQuery && !initialLoading && nearbyLocations.length > 0 && (
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
                            className={`shrink-0 object-contain ${
                              loc.category === 'restaurant' ? 'h-10 w-10' : 
                              loc.category === 'hotel' ? 'h-9 w-9' : 'h-8 w-8'
                            }`}
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

          {/* Empty State - No nearby locations found */}
          {!searchQuery && !initialLoading && nearbyLocations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium">🗺️ {t('noNearbyPlaces', { defaultValue: 'Nessun nuovo luogo vicino' })}</p>
              <p className="text-sm text-muted-foreground mt-1">✨ {t('trySearching', { defaultValue: 'Prova a cercare un luogo' })}</p>
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