import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search, X, Sparkles, ChevronDown } from 'lucide-react';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { searchPhoton, PhotonResult } from '@/lib/photonGeocoding';
import { useTopCities } from '@/hooks/useTopCities';
import { useCityEngagement } from '@/hooks/useCityEngagement';
import CityEngagementCard from './CityEngagementCard';
import { useTranslation } from 'react-i18next';
import { translateCityName } from '@/utils/cityTranslations';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UnifiedSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: string, coordinates: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: PhotonResult) => void;
}

interface CityResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const UnifiedSearchOverlay = ({ isOpen, onClose, onCitySelect, onLocationSelect }: UnifiedSearchOverlayProps) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [locationResults, setLocationResults] = useState<PhotonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCacheRef = useRef<Map<string, CityResult[]>>(new Map());
  
  // Exploration panel state
  const [explorationCity, setExplorationCity] = useState<{ name: string; coords: { lat: number; lng: number } } | null>(null);
  const [explorationLocations, setExplorationLocations] = useState<PhotonResult[]>([]);
  const [explorationQuery, setExplorationQuery] = useState('');
  const [searchContext, setSearchContext] = useState<string[]>([]);
  const [explorationLoading, setExplorationLoading] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  
  // Get top cities by pins
  const { topCities } = useTopCities();

  const popularCities = [
    { name: 'Dublin', lat: 53.3498053, lng: -6.2603097 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
    { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
    { name: 'Rome', lat: 41.9028, lng: 12.4964 }
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      // Reset state when closed
      setExplorationCity(null);
      setSearchContext([]);
      setExplorationQuery('');
    }
  }, [isOpen]);

  // Close overlay with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (explorationCity) {
          setExplorationCity(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, explorationCity]);

  useEffect(() => {
    const cacheKey = `${query.toLowerCase().trim()}-${i18n.language}`;
    
    if (!query.trim()) {
      setCityResults([]);
      setLocationResults([]);
      setLoading(false);
      return;
    }
    
    if (searchCacheRef.current.has(cacheKey)) {
      setCityResults(searchCacheRef.current.get(cacheKey)!);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const timer = setTimeout(() => {
      searchAll();
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const searchAll = async () => {
    if (!query.trim()) return;

    const cacheKey = `${query.toLowerCase()}-${i18n.language}`;
    setLoading(true);
    
    try {
      // Search cities and locations in parallel
      const [nominatimResults, photonResults] = await Promise.all([
        nominatimGeocoding.searchPlace(query, i18n.language),
        searchPhoton(query, undefined, 6)
      ]);
      
      const mappedCities = nominatimResults.map(result => ({
        name: result.city || result.displayName.split(',')[0],
        address: result.displayName,
        lat: result.lat,
        lng: result.lng,
      }));
      
      searchCacheRef.current.set(cacheKey, mappedCities);
      setCityResults(mappedCities);
      setLocationResults(photonResults);
    } catch (error) {
      console.error('Search error:', error);
      setCityResults([]);
      setLocationResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = async (city: { name: string; lat: number; lng: number }) => {
    // Set exploration mode
    setExplorationCity({ name: city.name, coords: { lat: city.lat, lng: city.lng } });
    setSearchContext([]);
    setExplorationQuery('');
    setPanelExpanded(false);
    
    // Load initial locations for the city
    setExplorationLoading(true);
    try {
      const results = await searchPhoton(city.name, { lat: city.lat, lng: city.lng }, 12);
      setExplorationLocations(results);
    } catch (error) {
      console.error('Failed to load city locations:', error);
    } finally {
      setExplorationLoading(false);
    }
    
    // Notify parent of city selection
    if (onCitySelect) {
      onCitySelect(city.name, { lat: city.lat, lng: city.lng });
    }
  };

  const handleLocationSelect = (location: PhotonResult) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    setQuery('');
    setCityResults([]);
    setLocationResults([]);
    setExplorationCity(null);
    onClose();
  };

  const handleExplorationSearch = async () => {
    if (!explorationQuery.trim() || !explorationCity) return;
    
    setExplorationLoading(true);
    const newContext = [...searchContext, explorationQuery.trim()];
    
    try {
      // Try AI-enhanced search for complex queries
      let searchTerms = [explorationQuery];
      if (newContext.length > 1) {
        try {
          const { data } = await supabase.functions.invoke('search-locations-ai', {
            body: { city: explorationCity.name, searchContext, query: explorationQuery }
          });
          if (data?.searchTerms?.length) {
            searchTerms = data.searchTerms;
          }
        } catch (e) {
          console.log('AI search unavailable, using standard search');
        }
      }
      
      // Search with all terms
      const allResults: PhotonResult[] = [];
      const seenIds = new Set<string>();
      
      for (const term of searchTerms) {
        const fullQuery = `${term} ${explorationCity.name}`;
        const termResults = await searchPhoton(fullQuery, explorationCity.coords, 8);
        
        for (const result of termResults) {
          if (!seenIds.has(result.id)) {
            seenIds.add(result.id);
            allResults.push(result);
          }
        }
      }
      
      setExplorationLocations(allResults.slice(0, 15));
      setSearchContext(newContext);
      setExplorationQuery('');
    } catch (error) {
      console.error('Exploration search error:', error);
    } finally {
      setExplorationLoading(false);
    }
  };

  const clearContext = () => {
    setSearchContext([]);
    if (explorationCity) {
      handleCitySelect({ name: explorationCity.name, lat: explorationCity.coords.lat, lng: explorationCity.coords.lng });
    }
  };

  const closeExploration = () => {
    setExplorationCity(null);
    setSearchContext([]);
    setExplorationQuery('');
  };

  if (!isOpen) return null;

  // Build display cities - prioritize top cities with actual pins
  const displayCities = topCities.length > 0 
    ? topCities.map(tc => {
        const popular = popularCities.find(p => p.name.toLowerCase() === tc.city.toLowerCase());
        return {
          name: tc.city,
          count: tc.count,
          lat: popular?.lat || 0,
          lng: popular?.lng || 0
        };
      })
    : popularCities.map(c => ({ ...c, count: 0 }));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[3000] flex flex-col" onClick={onClose}>
      {/* Header with search */}
      <div className="bg-background px-4 pt-[calc(env(safe-area-inset-top)+2.1875rem)] pb-3 shadow-lg border-b border-border" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t('searchCitiesAndPlaces', { ns: 'home', defaultValue: 'Search cities or places...' })}
            className="w-full pl-10 pr-24 py-3 text-base bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 className="absolute right-16 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
          )}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (explorationCity) {
                closeExploration();
              } else {
                onClose();
              }
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-2"
          >
            {t('cancel', { ns: 'common' })}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto bg-background" onClick={(e) => e.stopPropagation()}>
        {/* City exploration panel (slide down from top) */}
        {explorationCity && (
          <div className={cn(
            "bg-background border-b border-border transition-all duration-300",
            panelExpanded ? "max-h-[70vh]" : "max-h-[45vh]"
          )}>
            {/* Panel header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{explorationCity.name}</h3>
                <button onClick={() => setPanelExpanded(!panelExpanded)}>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", panelExpanded && "rotate-180")} />
                </button>
              </div>
              <button onClick={closeExploration} className="p-1.5 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Search context tags */}
            {searchContext.length > 0 && (
              <div className="px-4 py-2 flex items-center gap-2 flex-wrap bg-muted/30">
                <span className="text-xs text-muted-foreground">{t('searchContext', { ns: 'common', defaultValue: 'Searching:' })}</span>
                {searchContext.map((ctx, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                    {ctx}
                  </span>
                ))}
                <button onClick={clearContext} className="text-xs text-muted-foreground hover:text-foreground underline">
                  {t('clear', { ns: 'common', defaultValue: 'Clear' })}
                </button>
              </div>
            )}
            
            {/* Exploration search */}
            <div className="px-4 py-3">
              <div className="relative">
                <input
                  type="text"
                  value={explorationQuery}
                  onChange={(e) => setExplorationQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleExplorationSearch()}
                  placeholder={searchContext.length > 0 
                    ? t('refineSearch', { ns: 'common', defaultValue: 'Refine your search...' })
                    : t('searchInCity', { city: explorationCity.name, ns: 'common', defaultValue: `Find places in ${explorationCity.name}...` })
                  }
                  className="w-full h-10 pl-4 pr-12 rounded-full bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
                <button
                  onClick={handleExplorationSearch}
                  disabled={explorationLoading || !explorationQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-full disabled:opacity-50"
                >
                  {explorationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Exploration results */}
            <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: panelExpanded ? 'calc(70vh - 180px)' : 'calc(45vh - 180px)' }}>
              {explorationLoading && explorationLocations.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : explorationLocations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('noLocationsFound', { ns: 'common', defaultValue: 'No locations found' })}
                </p>
              ) : (
                <div className="space-y-2">
                  {explorationLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full p-3 flex items-start gap-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{location.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{location.displayAddress}</p>
                        <span className="text-[10px] px-2 py-0.5 mt-1 inline-block rounded-full bg-muted text-muted-foreground capitalize">
                          {location.category === 'entertainment' ? 'fun' : location.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Default content - city chips and search results */}
        {!explorationCity && (
          <div className="px-4 py-4">
            {/* Show top cities when no query */}
            {!query.trim() && (
              <div className="flex flex-wrap gap-2 mb-4">
                {displayCities.map((city) => {
                  const translatedName = translateCityName(city.name, i18n.language);
                  return (
                    <CityEngagementCard
                      key={city.name}
                      cityName={translatedName}
                      coords={city.lat && city.lng ? { lat: city.lat, lng: city.lng } : undefined}
                      onClick={() => {
                        if (city.lat && city.lng) {
                          handleCitySelect({ name: city.name, lat: city.lat, lng: city.lng });
                        }
                      }}
                      baseCount={city.count}
                    />
                  );
                })}
              </div>
            )}

            {/* City search results */}
            {cityResults.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t('cities', { ns: 'common', defaultValue: 'Cities' })}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Map(cityResults.map(r => [r.name.split(',')[0].trim().toLowerCase(), r])).values()).map((city, index) => (
                    <CityEngagementCard
                      key={index}
                      cityName={city.name.split(',')[0].trim()}
                      coords={{ lat: city.lat, lng: city.lng }}
                      onClick={() => handleCitySelect(city)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Location search results */}
            {locationResults.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t('places', { ns: 'common', defaultValue: 'Places' })}
                </h4>
                <div className="space-y-2">
                  {locationResults.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full p-3 flex items-start gap-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{location.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{location.displayAddress}</p>
                        <span className="text-[10px] px-2 py-0.5 mt-1 inline-block rounded-full bg-muted text-muted-foreground capitalize">
                          {location.category === 'entertainment' ? 'fun' : location.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results state */}
            {query.trim() && !loading && cityResults.length === 0 && locationResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MapPin className="w-16 h-16 mb-3 opacity-50" />
                <p className="text-lg font-medium">{t('noCitiesFound', { ns: 'explore', defaultValue: 'No results found' })}</p>
                <p className="text-sm opacity-75 mt-1">{t('tryDifferentSearch', { ns: 'explore', defaultValue: 'Try a different search' })}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedSearchOverlay;
