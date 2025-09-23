import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building, Landmark, Building2, Clock, Mountain, Shield, Church, Waves, TreePine, Locate, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGeolocation } from '@/hooks/useGeolocation';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';

interface GlobalCitySearchProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
}

// Comprehensive global city data
const globalCities = {
  // Europe
  'london': { name: 'London', country: 'United Kingdom', icon: Clock, description: 'Capital of England', continent: 'Europe' },
  'paris': { name: 'Paris', country: 'France', icon: Landmark, description: 'City of Light', continent: 'Europe' },
  'milan': { name: 'Milan', country: 'Italy', icon: Church, description: 'Fashion Capital', continent: 'Europe' },
  'rome': { name: 'Rome', country: 'Italy', icon: Shield, description: 'Eternal City', continent: 'Europe' },
  'barcelona': { name: 'Barcelona', country: 'Spain', icon: Church, description: 'Gaudí\'s City', continent: 'Europe' },
  'madrid': { name: 'Madrid', country: 'Spain', icon: Building, description: 'Spanish Capital', continent: 'Europe' },
  'amsterdam': { name: 'Amsterdam', country: 'Netherlands', icon: Waves, description: 'Venice of North', continent: 'Europe' },
  'berlin': { name: 'Berlin', country: 'Germany', icon: Building2, description: 'German Capital', continent: 'Europe' },
  'munich': { name: 'Munich', country: 'Germany', icon: Mountain, description: 'Bavarian Capital', continent: 'Europe' },
  'vienna': { name: 'Vienna', country: 'Austria', icon: Church, description: 'Imperial City', continent: 'Europe' },
  'zurich': { name: 'Zurich', country: 'Switzerland', icon: Mountain, description: 'Financial Hub', continent: 'Europe' },
  'lisbon': { name: 'Lisbon', country: 'Portugal', icon: Waves, description: 'City of Seven Hills', continent: 'Europe' },
  'dublin': { name: 'Dublin', country: 'Ireland', icon: Building, description: 'Emerald Isle Capital', continent: 'Europe' },
  'stockholm': { name: 'Stockholm', country: 'Sweden', icon: Waves, description: 'Venice of the North', continent: 'Europe' },
  'copenhagen': { name: 'Copenhagen', country: 'Denmark', icon: Waves, description: 'Danish Design Capital', continent: 'Europe' },
  'prague': { name: 'Prague', country: 'Czech Republic', icon: Church, description: 'City of a Hundred Spires', continent: 'Europe' },
  'budapest': { name: 'Budapest', country: 'Hungary', icon: Church, description: 'Pearl of the Danube', continent: 'Europe' },
  'warsaw': { name: 'Warsaw', country: 'Poland', icon: Building, description: 'Phoenix City', continent: 'Europe' },
  'athens': { name: 'Athens', country: 'Greece', icon: Shield, description: 'Cradle of Democracy', continent: 'Europe' },
  
  // North America
  'new york': { name: 'New York', country: 'United States', icon: Building, description: 'The Big Apple', continent: 'North America' },
  'los angeles': { name: 'Los Angeles', country: 'United States', icon: Building2, description: 'City of Angels', continent: 'North America' },
  'san francisco': { name: 'San Francisco', country: 'United States', icon: Building2, description: 'Golden Gate City', continent: 'North America' },
  'chicago': { name: 'Chicago', country: 'United States', icon: Building, description: 'Windy City', continent: 'North America' },
  'miami': { name: 'Miami', country: 'United States', icon: Waves, description: 'Magic City', continent: 'North America' },
  'las vegas': { name: 'Las Vegas', country: 'United States', icon: Building2, description: 'Entertainment Capital', continent: 'North America' },
  'boston': { name: 'Boston', country: 'United States', icon: Building, description: 'Cradle of Liberty', continent: 'North America' },
  'seattle': { name: 'Seattle', country: 'United States', icon: Mountain, description: 'Emerald City', continent: 'North America' },
  'washington dc': { name: 'Washington DC', country: 'United States', icon: Building, description: 'US Capital', continent: 'North America' },
  'toronto': { name: 'Toronto', country: 'Canada', icon: Building, description: 'The Six', continent: 'North America' },
  'vancouver': { name: 'Vancouver', country: 'Canada', icon: Mountain, description: 'Rain City', continent: 'North America' },
  'montreal': { name: 'Montreal', country: 'Canada', icon: Building, description: 'City of Festivals', continent: 'North America' },
  'mexico city': { name: 'Mexico City', country: 'Mexico', icon: Mountain, description: 'Aztec Capital', continent: 'North America' },
  
  // Asia
  'tokyo': { name: 'Tokyo', country: 'Japan', icon: Mountain, description: 'Land of Rising Sun', continent: 'Asia' },
  'osaka': { name: 'Osaka', country: 'Japan', icon: Building, description: 'Kitchen of Japan', continent: 'Asia' },
  'kyoto': { name: 'Kyoto', country: 'Japan', icon: Church, description: 'Ancient Capital', continent: 'Asia' },
  'seoul': { name: 'Seoul', country: 'South Korea', icon: Mountain, description: 'K-Pop Capital', continent: 'Asia' },
  'beijing': { name: 'Beijing', country: 'China', icon: Shield, description: 'Forbidden City', continent: 'Asia' },
  'shanghai': { name: 'Shanghai', country: 'China', icon: Building, description: 'Oriental Pearl', continent: 'Asia' },
  'hong kong': { name: 'Hong Kong', country: 'China', icon: Building, description: 'Pearl of the Orient', continent: 'Asia' },
  'singapore': { name: 'Singapore', country: 'Singapore', icon: Building, description: 'Lion City', continent: 'Asia' },
  'bangkok': { name: 'Bangkok', country: 'Thailand', icon: Church, description: 'City of Angels', continent: 'Asia' },
  'mumbai': { name: 'Mumbai', country: 'India', icon: Building, description: 'Bollywood Capital', continent: 'Asia' },
  'delhi': { name: 'Delhi', country: 'India', icon: Shield, description: 'Indian Capital', continent: 'Asia' },
  'bangalore': { name: 'Bangalore', country: 'India', icon: Building, description: 'Silicon Valley of India', continent: 'Asia' },
  'dubai': { name: 'Dubai', country: 'UAE', icon: Building, description: 'City of Gold', continent: 'Asia' },
  'tel aviv': { name: 'Tel Aviv', country: 'Israel', icon: Waves, description: 'White City', continent: 'Asia' },
  'istanbul': { name: 'Istanbul', country: 'Turkey', icon: Church, description: 'Bridge of Continents', continent: 'Asia' },
  
  // Oceania
  'sydney': { name: 'Sydney', country: 'Australia', icon: Waves, description: 'Harbor City', continent: 'Oceania' },
  'melbourne': { name: 'Melbourne', country: 'Australia', icon: Building, description: 'Cultural Capital', continent: 'Oceania' },
  'brisbane': { name: 'Brisbane', country: 'Australia', icon: Waves, description: 'River City', continent: 'Oceania' },
  'perth': { name: 'Perth', country: 'Australia', icon: Waves, description: 'Isolated City', continent: 'Oceania' },
  'auckland': { name: 'Auckland', country: 'New Zealand', icon: Waves, description: 'City of Sails', continent: 'Oceania' },
  
  // South America
  'sao paulo': { name: 'São Paulo', country: 'Brazil', icon: Building, description: 'Brazilian Megacity', continent: 'South America' },
  'rio de janeiro': { name: 'Rio de Janeiro', country: 'Brazil', icon: Mountain, description: 'Marvelous City', continent: 'South America' },
  'buenos aires': { name: 'Buenos Aires', country: 'Argentina', icon: Building, description: 'Paris of South America', continent: 'South America' },
  'lima': { name: 'Lima', country: 'Peru', icon: Building, description: 'City of Kings', continent: 'South America' },
  'bogota': { name: 'Bogotá', country: 'Colombia', icon: Mountain, description: 'Athens of South America', continent: 'South America' },
  'santiago': { name: 'Santiago', country: 'Chile', icon: Mountain, description: 'Capital of Chile', continent: 'South America' },
  
  // Africa
  'cape town': { name: 'Cape Town', country: 'South Africa', icon: Mountain, description: 'Mother City', continent: 'Africa' },
  'johannesburg': { name: 'Johannesburg', country: 'South Africa', icon: Building, description: 'City of Gold', continent: 'Africa' },
  'cairo': { name: 'Cairo', country: 'Egypt', icon: Shield, description: 'City of a Thousand Minarets', continent: 'Africa' },
  'marrakech': { name: 'Marrakech', country: 'Morocco', icon: Shield, description: 'Red City', continent: 'Africa' },
  'casablanca': { name: 'Casablanca', country: 'Morocco', icon: Building, description: 'Economic Capital', continent: 'Africa' },
  'lagos': { name: 'Lagos', country: 'Nigeria', icon: Building, description: 'Commercial Capital', continent: 'Africa' },
  'nairobi': { name: 'Nairobi', country: 'Kenya', icon: TreePine, description: 'Green City in the Sun', continent: 'Africa' },
};

// Function to calculate string similarity
const getSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const getEditDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

const GlobalCitySearch = ({ 
  searchQuery, 
  currentCity, 
  onSearchChange, 
  onSearchKeyPress,
  onCitySelect 
}: GlobalCitySearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<Array<{key: string, data: typeof globalCities[keyof typeof globalCities], similarity: number}>>([]);
  const [userHasManuallySelectedCity, setUserHasManuallySelectedCity] = useState(false);
  const [ignoreGeoLocation, setIgnoreGeoLocation] = useState(false);
  const [externalResults, setExternalResults] = useState<Array<{ name: string; lat: number; lng: number; subtitle?: string }>>([]);
  const [isFetchingExternal, setIsFetchingExternal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();

  // Only update current city from geolocation if user hasn't manually selected one AND not ignoring geo
  useEffect(() => {
    if (location?.city && 
        location.city !== currentCity && 
        !userHasManuallySelectedCity && 
        !ignoreGeoLocation) {
      console.log('Geolocation detected city:', location.city);
      onCitySelect(location.city);
    }
  }, [location?.city, currentCity, onCitySelect, userHasManuallySelectedCity, ignoreGeoLocation]);

  // Get current city data
  const currentCityData = globalCities[currentCity.toLowerCase() as keyof typeof globalCities];
  const CurrentCityIcon = currentCityData?.icon || MapPin;

  useEffect(() => {
    if (searchQuery.trim() && searchQuery.trim() !== ' ') {
      const query = searchQuery.toLowerCase().trim();
      
      // Find matches with similarity scoring
      const matches = Object.entries(globalCities)
        .map(([key, data]) => {
          let bestSimilarity = 0;
          
          // Check city name
          if (data.name.toLowerCase().includes(query) || query.includes(data.name.toLowerCase())) {
            bestSimilarity = Math.max(bestSimilarity, 0.9);
          } else {
            const nameSimilarity = getSimilarity(query, data.name.toLowerCase());
            bestSimilarity = Math.max(bestSimilarity, nameSimilarity);
          }
          
          // Check country
          if (data.country.toLowerCase().includes(query)) {
            bestSimilarity = Math.max(bestSimilarity, 0.8);
          }
          
          // Check continent
          if (data.continent.toLowerCase().includes(query)) {
            bestSimilarity = Math.max(bestSimilarity, 0.7);
          }
          
          // Check key (for multi-word cities like "new york")
          if (key.includes(query) || query.includes(key)) {
            bestSimilarity = Math.max(bestSimilarity, 0.9);
          }
          
          return { key, data, similarity: bestSimilarity };
        })
        .filter(item => item.similarity > 0.3) // Show more permissive matches for global search
        .sort((a, b) => b.similarity - a.similarity) // Sort by best match first
        .slice(0, 8); // Show more results for global search
      
      setFilteredCities(matches);
      setIsOpen(true);
    } else {
      setFilteredCities([]);
      setIsOpen(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch global city results from Nominatim with debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q === ' ') { setExternalResults([]); return; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsFetchingExternal(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=25&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { signal: controller.signal });
        const json: any[] = await res.json();

        const allowed = ['city','town','village','municipality','locality','suburb','county','administrative','boundary'];
        const typePriority: Record<string, number> = {
          city: 7, town: 6, municipality: 5, village: 4, locality: 3, suburb: 2, county: 1, administrative: 0, boundary: 0
        };

        // Normalize helper
        const norm = (s: string) => (s || '')
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .trim();

        // Filter, dedupe by city+country, keep best quality entry per key
        const dedupe = new Map<string, any>();
        (json || [])
          .filter((item: any) => {
            const type = item?.type || '';
            const addresstype = item?.addresstype || '';
            const placeRank = Number(item?.place_rank || 0);
            return (
              allowed.includes(type) ||
              allowed.includes(addresstype) ||
              (type === 'administrative' && (['city','town','village','municipality','county'].includes(addresstype) || (placeRank >= 8 && placeRank <= 16)))
            );
          })
          .forEach((item: any) => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.locality || addr.county || (item.display_name?.split(',')[0] || '');
            if (!city) return;
            const country = addr.country || '';
            const state = addr.state || addr.region || addr.province || addr.county || '';
            const key = `${norm(city)}|${norm(state)}|${norm(country)}`;
            const type = item?.type || '';
            const addresstype = item?.addresstype || '';
            const prio = Math.max(typePriority[type] || 0, typePriority[addresstype] || 0);
            const qn = norm(q);
            const cn = norm(city);
            let score = prio;
            if (cn === qn) score += 5; else if (cn.startsWith(qn)) score += 3; else if (cn.includes(qn)) score += 1;
            score += Math.min(Number(item.place_rank || 0) / 10, 2);

            const candidate = {
              city,
              country,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              state,
              score,
            };

            const existing = dedupe.get(key);
            if (!existing || candidate.score > existing.score) dedupe.set(key, candidate);
          });

        const results = Array.from(dedupe.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((r: any) => ({
            name: `${r.city}${r.country ? ', ' + r.country : ''}`,
            lat: r.lat,
            lng: r.lng,
            subtitle: r.state || undefined,
          }));

        setExternalResults(results);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.warn('City search fetch failed', e);
          setExternalResults([]);
        }
      } finally {
        setIsFetchingExternal(false);
      }
    }, 350);

    return () => { controller.abort(); clearTimeout(timer); };
  }, [searchQuery]);
  const handleCityClick = async (cityName: string, coords?: { lat: number; lng: number }) => {
    console.log('Manual city selection:', cityName, coords);
    setUserHasManuallySelectedCity(true);
    setIgnoreGeoLocation(true);

    let finalCoords = coords;
    if (!finalCoords) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cityName)}`);
        const json: any[] = await res.json();
        if (json && json[0]) {
          finalCoords = { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
        }
      } catch (e) {
        console.warn('Fallback geocode failed', e);
      }
    }

    onCitySelect(cityName, finalCoords);
    onSearchChange('');
    setIsOpen(false);
  };

  const handleLocationClick = () => {
    console.log('Location button clicked - resetting manual selection');
    setUserHasManuallySelectedCity(false);
    setIgnoreGeoLocation(false);
    getCurrentLocation();
  };

  // Group cities by continent for better organization
  const groupedCities = filteredCities.reduce((acc, city) => {
    const continent = city.data.continent;
    if (!acc[continent]) acc[continent] = [];
    acc[continent].push(city);
    return acc;
  }, {} as Record<string, typeof filteredCities>);

  return (
    <div ref={searchRef} className="relative flex-1 max-w-sm z-[200]">
      {/* Current City Display / Search Input */}
      <div className="relative">
        {!searchQuery || searchQuery.trim() === ' ' ? (
          // Show current city when not searching
          <div className="flex items-center gap-3 bg-white/95 border border-gray-200 rounded-2xl h-12 px-4 hover:bg-white transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-sm"
               onClick={() => document.getElementById('global-city-search-input')?.focus()}>
            <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-gray-900 font-semibold text-base truncate">
                {currentCityData?.name || currentCity || 'Select City'}
              </span>
              {currentCityData?.country && (
                <div className="text-xs text-gray-500">{currentCityData.country}</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {geoLoading && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLocationClick();
                }}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
                title="Detect current location"
              >
                <Locate className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          // Show search input when searching
          <div className="relative">
            <Input
              id="global-city-search-input"
              type="text"
              placeholder="Search cities worldwide..."
              value={searchQuery === ' ' ? '' : searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              onFocus={() => searchQuery && setIsOpen(true)}
              className="pl-12 pr-12 bg-white/95 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl h-12 text-base shadow-lg backdrop-blur-sm"
              autoFocus
            />
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        )}
      </div>

      {/* Hidden input for focusing */}
      {(!searchQuery || searchQuery.trim() === ' ') && (
        <input
          id="global-city-search-input"
          type="text"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onFocus={() => onSearchChange(' ')}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={onSearchKeyPress}
        />
      )}

      {/* Dropdown Results - Organized by continent */}
      {isOpen && (Object.keys(groupedCities).length > 0 || externalResults.length > 0) && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={() => { setIsOpen(false); onSearchChange(''); }}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100/50 max-h-72 overflow-hidden z-[9999]">
            <div className="overflow-y-auto max-h-72 divide-y divide-gray-50">
              {/* External global results */}
              {externalResults.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50/60 text-[10px] font-bold text-gray-700 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                    Global results
                  </div>
                  {externalResults.map((item, idx) => (
                    <button
                      key={`ext-${idx}`}
                      onClick={() => handleCityClick(item.name, { lat: item.lat, lng: item.lng })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/60 transition-colors text-left"
                    >
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{item.name}</div>
                        {item.subtitle && <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {Object.entries(groupedCities).map(([continent, cities]) => (
                <div key={continent}>
                  <div className="px-4 py-2 bg-gray-50/60 text-[10px] font-bold text-gray-700 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                    {continent}
                  </div>
                  {cities.map(({ key, data, similarity }) => {
                    const IconComponent = data.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleCityClick(data.name)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/60 transition-colors text-left"
                      >
                        <IconComponent className="w-4 h-4 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{data.name}</div>
                          <div className="text-xs text-gray-500 truncate">{data.country}</div>
                        </div>
                        {similarity > 0.8 && (
                          <div className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                            Best Match
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isOpen && searchQuery.trim() && searchQuery.trim() !== ' ' && externalResults.length === 0 && Object.keys(groupedCities).length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[9999] backdrop-blur-sm">
          <div className="text-gray-500 text-sm text-center">
            <div className="mb-2">No cities found for "{searchQuery}"</div>
            <div className="text-xs">Try another spelling or a nearby city</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalCitySearch;