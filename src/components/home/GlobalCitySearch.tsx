import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building, Landmark, Building2, Clock, Mountain, Shield, Church, Waves, TreePine, Locate, Globe, TrendingUp, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTrendingCities } from '@/hooks/useTrendingCities';
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
  const [filteredCities, setFilteredCities] = useState<Array<{key: string, data: typeof globalCities[keyof typeof globalCities], similarity: number, isTrending?: boolean}>>([]);
  const [userHasManuallySelectedCity, setUserHasManuallySelectedCity] = useState(false);
  const [ignoreGeoLocation, setIgnoreGeoLocation] = useState(false);
  const [externalResults, setExternalResults] = useState<Array<{ name: string; lat: number; lng: number; subtitle?: string }>>([]);
  const [isFetchingExternal, setIsFetchingExternal] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const { location, loading: geoLoading, getCurrentLocation } = useGeolocation();
  const { trendingCities, loading: trendingLoading } = useTrendingCities();

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

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentCitySearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim() && searchQuery.trim() !== ' ') {
      const query = searchQuery.toLowerCase().trim();
      
      // Get trending city names
      const trendingCityNames = trendingCities.map(tc => tc.city.toLowerCase());
      
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
          
          // Boost score if city is trending
          const isTrending = trendingCityNames.includes(data.name.toLowerCase());
          if (isTrending) {
            bestSimilarity += 0.5;
          }
          
          return { key, data, similarity: bestSimilarity, isTrending };
        })
        .filter(item => item.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5); // Limit to 5 results for mobile
      
      setFilteredCities(matches);
      setIsOpen(true);
    } else {
      setFilteredCities([]);
      setIsOpen(false);
    }
  }, [searchQuery, trendingCities]);

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
            const key = `${norm(city)}|${norm(country)}`;
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
          .slice(0, 5) // Limit to 5 for mobile
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

    // Save to recent searches
    const updated = [cityName, ...recentSearches.filter(c => c !== cityName)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentCitySearches', JSON.stringify(updated));

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
    <div ref={searchRef} className="relative flex-1 flex-grow max-w-full z-[200]">
      {/* Current City Display / Search Input - Mobile Optimized */}
      <div className="relative">
        {!searchQuery || searchQuery.trim() === ' ' ? (
          // Show current city when not searching
          <div 
            className="flex items-center gap-2 bg-white/95 border border-gray-200 rounded-xl h-10 px-3 hover:bg-white transition-all duration-200 cursor-pointer shadow-sm backdrop-blur-sm"
            onClick={() => {
              onSearchChange(' ');
              setIsOpen(true);
            }}
          >
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-gray-900 font-medium text-sm truncate">
                {currentCityData?.name || currentCity || 'Select City'}
              </span>
              {currentCityData?.country && (
                <div className="text-[10px] text-gray-500 leading-none">{currentCityData.country}</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {geoLoading && (
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLocationClick();
                }}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
                title="Detect current location"
              >
                <Locate className="w-3 h-3" />
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
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-10 bg-white/95 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl h-10 text-sm shadow-sm backdrop-blur-sm"
              autoFocus
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        )}
      </div>

      {/* Bottom Sheet for City Selection */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[70vh] rounded-t-3xl border-t-0 p-0 overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-none"
        >
          <SheetHeader className="px-6 py-4 border-b bg-gradient-to-br from-blue-50 to-white">
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Select City
            </SheetTitle>
            <div className="mt-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search cities worldwide..."
                  value={searchQuery === ' ' ? '' : searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-4 bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl h-10 text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
          </SheetHeader>

          <div className="overflow-y-auto h-[calc(70vh-140px)] pb-6">
            {!searchQuery || searchQuery.trim() === ' ' ? (
              // Show suggested and recent when not searching
              <div className="space-y-6 px-6 py-4">
                {/* Suggested For You */}
                {trendingCities.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Suggerite per te
                    </h3>
                    <div className="space-y-2">
                      {trendingCities.map((tc) => {
                        const cityKey = Object.keys(globalCities).find(
                          key => globalCities[key as keyof typeof globalCities].name.toLowerCase() === tc.city.toLowerCase()
                        );
                        const cityData = cityKey ? globalCities[cityKey as keyof typeof globalCities] : null;
                        const CityIcon = cityData?.icon || MapPin;
                        
                        return (
                          <button
                            key={tc.city}
                            onClick={() => handleCityClick(tc.city)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-200 group"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              <CityIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-semibold text-gray-900 text-sm">{tc.city}</div>
                              {cityData?.country && (
                                <div className="text-xs text-gray-500">{cityData.country}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium shrink-0">
                              <Users className="w-3 h-3" />
                              {tc.friendCount}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      Recentemente cercate
                    </h3>
                    <div className="space-y-2">
                      {recentSearches.map((city) => {
                        const cityKey = Object.keys(globalCities).find(
                          key => globalCities[key as keyof typeof globalCities].name.toLowerCase() === city.toLowerCase()
                        );
                        const cityData = cityKey ? globalCities[cityKey as keyof typeof globalCities] : null;
                        const CityIcon = cityData?.icon || MapPin;
                        
                        return (
                          <button
                            key={city}
                            onClick={() => handleCityClick(city)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all duration-200"
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <CityIcon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium text-gray-900 text-sm">{city}</div>
                              {cityData?.country && (
                                <div className="text-xs text-gray-500">{cityData.country}</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Show search results
              <div className="px-6 py-4">
                {isFetchingExternal && (
                  <div className="py-4 text-center">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                )}

                {/* External global results */}
                {externalResults.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                      Global Results
                    </h3>
                    <div className="space-y-2">
                      {externalResults.map((item, idx) => (
                        <button
                          key={`ext-${idx}`}
                          onClick={() => handleCityClick(item.name, { lat: item.lat, lng: item.lng })}
                          className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shrink-0">
                            <Globe className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                            {item.subtitle && <div className="text-xs text-gray-500">{item.subtitle}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped cities by continent */}
                {Object.entries(groupedCities).map(([continent, cities]) => (
                  <div key={continent} className="mb-6">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                      {continent}
                    </h3>
                    <div className="space-y-2">
                      {cities.map(({ key, data, isTrending }) => {
                        const CityIcon = data.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => handleCityClick(data.name)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-all duration-200 group"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isTrending 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                : 'bg-gray-100'
                            }`}>
                              <CityIcon className={`w-5 h-5 ${isTrending ? 'text-white' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                {data.name}
                                {isTrending && <TrendingUp className="w-3 h-3 text-blue-600" />}
                              </div>
                              <div className="text-xs text-gray-500">{data.country}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredCities.length === 0 && externalResults.length === 0 && !isFetchingExternal && (
                  <div className="py-8 text-center text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No cities found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GlobalCitySearch;