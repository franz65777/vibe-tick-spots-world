import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPostLibrary from './LocationPostLibrary';
import { AllowedCategory, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
import { getCachedData, clearCache } from '@/services/performanceService';
import { normalizeCity } from '@/utils/cityNormalization';

interface LocationGridProps {
  searchQuery?: string;
  selectedCategory?: AllowedCategory | null;
}

interface LocationCard {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  coverImage?: string;
  postsCount: number;
  savesCount: number;
  rankingScore?: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

const LocationGrid = ({ searchQuery, selectedCategory }: LocationGridProps) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationCard | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [userSavedIds, setUserSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLocations();
  }, [searchQuery, selectedCategory, user?.id]);

  const fetchLocations = async () => {
    if (!user) {
      setLocations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Create cache key based on search and category
      const cacheKey = `locations-grid-${searchQuery || 'all'}-${selectedCategory || 'all'}-${user.id}`;

      // Use cached data with 2 minute expiry for better performance
      const cachedLocations = await getCachedData(
        cacheKey,
        async () => {
          return await fetchLocationsData();
        },
        2 * 60 * 1000 // 2 minutes cache
      );

      setLocations(cachedLocations.locations);
      setUserSavedIds(cachedLocations.userSavedIds);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsData = async () => {
    if (!user) return { locations: [], userSavedIds: new Set<string>() };

      // Fetch from locations table
      let query = supabase
        .from('locations')
        .select(`
          id,
          name,
          category,
          city,
          address,
          google_place_id,
          latitude,
          longitude
        `);

      // Apply search filter - Search across name, city, and address
      // Also normalize the search query to match against normalized city names
      if (searchQuery && searchQuery.trim()) {
        const normalizedSearch = normalizeCity(searchQuery.trim());
        // Search both raw and normalized city names for better matching
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,city.ilike.%${normalizedSearch}%,address.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data: locationsData, error } = await query.limit(100);

      if (error) throw error;

      // Also fetch from saved_places to include Google Places that might not be in locations yet
      let savedPlacesQuery = supabase
        .from('saved_places')
        .select('place_id, place_name, place_category, city, coordinates');

      if (searchQuery && searchQuery.trim()) {
        const normalizedSearch = normalizeCity(searchQuery.trim());
        savedPlacesQuery = savedPlacesQuery.or(`place_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,city.ilike.%${normalizedSearch}%`);
      }

      if (selectedCategory) {
        savedPlacesQuery = savedPlacesQuery.eq('place_category', selectedCategory);
      }

      const { data: savedPlacesData } = await savedPlacesQuery.limit(100);

      // Convert saved_places to location format, filtering out low-quality entries
      // Normalize city names for consistency
      const savedPlacesAsLocations = (savedPlacesData || [])
        .filter(sp => sp.place_name && sp.place_name !== 'Unknown' && sp.city && sp.city !== 'Unknown')
        .map(sp => ({
          id: sp.place_id,
          name: sp.place_name,
          category: sp.place_category || 'place',
          city: normalizeCity(sp.city) || 'Unknown',
          address: undefined,
          google_place_id: sp.place_id,
          latitude: (sp.coordinates as any)?.lat,
          longitude: (sp.coordinates as any)?.lng,
        }));

      // Merge both datasets
      const allLocations = [...(locationsData || []), ...savedPlacesAsLocations];

      // Get ALL saves for these locations (from all users)
      const locationIds = allLocations.map(l => l.id);
      const { data: savesData } = await supabase
        .from('user_saved_locations')
        .select('location_id, user_id')
        .in('location_id', locationIds);

      // Also count saves from saved_places table
      const placeIds = allLocations.map(l => l.google_place_id).filter(Boolean);
      const { data: savedPlacesCountData } = await supabase
        .from('saved_places')
        .select('place_id, user_id')
        .in('place_id', placeIds);

      // Fetch posts count for all locations
      const { data: postsData } = await supabase
        .from('posts')
        .select('location_id, id')
        .in('location_id', locationIds);

      // Fetch ratings from interactions table
      const { data: ratingsData } = await supabase
        .from('interactions')
        .select('location_id, weight')
        .in('location_id', locationIds)
        .eq('action_type', 'review')
        .not('weight', 'is', null);

      const savesMap = new Map<string, number>();
      savesData?.forEach(save => {
        savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
      });

      // Count saves from saved_places by place_id
      const savedPlacesSavesMap = new Map<string, number>();
      savedPlacesCountData?.forEach(save => {
        savedPlacesSavesMap.set(save.place_id, (savedPlacesSavesMap.get(save.place_id) || 0) + 1);
      });

      // Count posts by location_id
      const postsMap = new Map<string, number>();
      postsData?.forEach(post => {
        postsMap.set(post.location_id, (postsMap.get(post.location_id) || 0) + 1);
      });

      // Calculate average rating by location_id
      const ratingsMap = new Map<string, number>();
      if (ratingsData && ratingsData.length > 0) {
        const ratingsByLocation = new Map<string, number[]>();
        ratingsData.forEach(r => {
          if (!ratingsByLocation.has(r.location_id)) {
            ratingsByLocation.set(r.location_id, []);
          }
          ratingsByLocation.get(r.location_id)!.push(Number(r.weight));
        });
        
        ratingsByLocation.forEach((ratings, locationId) => {
          const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
          ratingsMap.set(locationId, Math.round(avg * 10) / 10);
        });
      }

      // Group by canonical place using google_place_id when available,
      // otherwise fall back to normalized name + city. Also link records that
      // share the same name+city with a record that has a google_place_id.
      type Grouped = LocationCard & { allLocationIds: string[]; nameCityKey: string; gpKey?: string };
      const groups = new Map<string, Grouped>(); // canonical key -> group
      const nameCityIndex = new Map<string, string>(); // nameCityKey -> canonical key

      const norm = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      const toNameCityKey = (loc: any) => {
        const cityFromAddr = loc.address?.split(',')[1]?.trim();
        const nameKey = norm(loc.name);
        const cityKey = norm(loc.city || cityFromAddr);
        return `${nameKey}_${cityKey}`;
      };

      allLocations.forEach((loc) => {
        const nameCityKey = toNameCityKey(loc);
        const gpKey = loc.google_place_id ? `gp:${loc.google_place_id}` : undefined;

        // Resolve existing canonical key if any
        let canonicalKey: string | undefined = gpKey && groups.has(gpKey)
          ? gpKey
          : nameCityIndex.get(nameCityKey);

        // If none exists, create a new group using the most stable key
        if (!canonicalKey) {
          canonicalKey = gpKey || `nc:${nameCityKey}`;
          groups.set(canonicalKey, {
            id: loc.id,
            name: loc.name,
            category: loc.category,
            city: loc.city || loc.address?.split(',')[1]?.trim() || 'Unknown',
            address: loc.address,
            google_place_id: loc.google_place_id,
            coverImage: null,
            postsCount: 0,
            savesCount: 0,
            rankingScore: 0,
            coordinates: {
              lat: parseFloat(loc.latitude?.toString() || '0'),
              lng: parseFloat(loc.longitude?.toString() || '0'),
            },
            allLocationIds: [loc.id],
            nameCityKey,
            gpKey,
          });
          // Index by name+city for future matches (even if later we see a gpKey)
          nameCityIndex.set(nameCityKey, canonicalKey);
        } else {
          // Merge into existing group
          const g = groups.get(canonicalKey)!;
          g.allLocationIds.push(loc.id);
          // Prefer complete data - update if current has better data
          if (!g.google_place_id && loc.google_place_id) g.google_place_id = loc.google_place_id;
          if (!g.address && loc.address) g.address = loc.address;
          if (g.city === 'Unknown' && loc.city && loc.city !== 'Unknown') g.city = loc.city;
          if (!g.name || g.name === 'Unknown') g.name = loc.name;
        }

        // Accumulate saves per location id (computed below once we have savesMap)
      });

      // Aggregate saves and posts across grouped location ids
      groups.forEach((g) => {
        const locationSaves = g.allLocationIds.reduce((sum, id) => sum + (savesMap.get(id) || 0), 0);
        const placeSaves = g.google_place_id ? (savedPlacesSavesMap.get(g.google_place_id) || 0) : 0;
        g.savesCount = locationSaves + placeSaves;
        
        // Count posts across all location IDs in this group
        const locationPosts = g.allLocationIds.reduce((sum, id) => sum + (postsMap.get(id) || 0), 0);
        g.postsCount = locationPosts;

        // Get average rating across all location IDs in this group
        const ratings = g.allLocationIds
          .map(id => ratingsMap.get(id))
          .filter((r): r is number => r !== undefined);
        if (ratings.length > 0) {
          const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
          g.rankingScore = Math.round(avgRating * 10) / 10;
        }
      });

      // Check if user saved ANY of the location IDs or place_id for each unique place
      const finalUserSavedIds = new Set<string>();
      groups.forEach((g) => {
        const userSavedLocation = g.allLocationIds.some((id) =>
          savesData?.some((s) => s.location_id === id && s.user_id === user?.id)
        );
        const userSavedPlace = g.google_place_id && savedPlacesCountData?.some(
          (s) => s.place_id === g.google_place_id && s.user_id === user?.id
        );
        if (userSavedLocation || userSavedPlace) finalUserSavedIds.add(g.id);
      });
      setUserSavedIds(finalUserSavedIds);

      // Sort by saves count (most popular first) and strip internal fields
      const uniqueLocations = Array.from(groups.values())
        .map(({ allLocationIds, nameCityKey, gpKey, ...rest }) => rest)
        .sort((a, b) => b.savesCount - a.savesCount);

      return {
        locations: uniqueLocations,
        userSavedIds: finalUserSavedIds
      };
  };

  const handleLocationClick = (location: LocationCard) => {
    setSelectedLocation(location);
    setIsLibraryOpen(true);
  };

  const handleSaveToggle = async (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const isSaved = userSavedIds.has(locationId);
      const location = locations.find(l => l.id === locationId);
      if (!location) return;
      
      if (isSaved) {
        // Unsave from both tables
        if (location.google_place_id) {
          // Delete from saved_places
          await supabase
            .from('saved_places')
            .delete()
            .eq('user_id', user.id)
            .eq('place_id', location.google_place_id);
        }
        
        // Also check if this is an internal location and delete from user_saved_locations
        const { data: internalLocations } = await supabase
          .from('locations')
          .select('id')
          .or(
            location.google_place_id 
              ? `google_place_id.eq.${location.google_place_id}` 
              : `and(latitude.eq.${location.coordinates.lat},longitude.eq.${location.coordinates.lng})`
          );
        
        if (internalLocations && internalLocations.length > 0) {
          const allIds = internalLocations.map(l => l.id);
          await supabase
            .from('user_saved_locations')
            .delete()
            .eq('user_id', user.id)
            .in('location_id', allIds);
        }
        
        const newSet = new Set(userSavedIds);
        newSet.delete(locationId);
        setUserSavedIds(newSet);
      } else {
        // Save - prioritize saved_places if it has google_place_id
        if (location.google_place_id) {
          await supabase
            .from('saved_places')
            .insert({
              user_id: user.id,
              place_id: location.google_place_id,
              place_name: location.name,
              place_category: location.category,
              city: location.city,
              coordinates: {
                lat: location.coordinates.lat,
                lng: location.coordinates.lng
              }
            });
        } else {
          // Save to user_saved_locations if no google_place_id
          await supabase
            .from('user_saved_locations')
            .insert({
              user_id: user.id,
              location_id: locationId
            });
        }
        
        const newSet = new Set(userSavedIds);
        newSet.add(locationId);
        setUserSavedIds(newSet);
      }

      // Clear cache and refresh locations to update save counts
      const cacheKey = `locations-grid-${searchQuery || 'all'}-${selectedCategory || 'all'}-${user.id}`;
      clearCache(cacheKey);
      fetchLocations();
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center">
          <p className="text-gray-500">No locations found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 px-2 pb-20">
        {locations.map((location) => {
          const isSaved = userSavedIds.has(location.id);
          
          return (
            <div
              key={location.id}
              onClick={() => handleLocationClick(location)}
              className="relative bg-white rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all border border-gray-200 flex flex-col h-[280px]"
            >
              {/* Top section with category and save */}
              <div className="relative p-2 flex items-start justify-between">
                <CategoryIcon category={location.category} className="w-7 h-7" />
                
                <button
                  onClick={(e) => handleSaveToggle(e, location.id)}
                  className={`rounded-full p-1.5 transition-colors ${
                    isSaved 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                  }`}
                  aria-label={isSaved ? 'Unsave location' : 'Save location'}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="px-2.5 flex-1 flex flex-col">
                <h4 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">
                  {location.name}
                </h4>
                
                {/* City */}
                <div className="flex items-center gap-1 mb-2">
                  <svg className="w-3 h-3 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-700 truncate">
                    <CityLabel id={location.google_place_id || location.id} city={location.city} address={location.address} coordinates={location.coordinates} />
                  </span>
                </div>

                {/* Stats Grid - Compact */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {/* Posts */}
                  <div className="flex flex-col items-center bg-gray-50 rounded-lg py-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-600 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-bold text-gray-900">{location.postsCount || 0}</span>
                    <span className="text-[9px] text-gray-500 font-medium">Posts</span>
                  </div>

                  {/* Saves */}
                  <div className="flex flex-col items-center bg-gray-50 rounded-lg py-1.5">
                    <svg className="w-3.5 h-3.5 text-purple-600 mb-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                    <span className="text-xs font-bold text-gray-900">{location.savesCount || 0}</span>
                    <span className="text-[9px] text-gray-500 font-medium">Saves</span>
                  </div>

                  {/* Rating - Show from rankingScore if available */}
                  <div className="flex flex-col items-center bg-yellow-50 rounded-lg py-1.5">
                    <svg className="w-3.5 h-3.5 text-yellow-500 mb-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs font-bold text-gray-900">
                      {location.rankingScore ? Math.min(10, Math.max(1, Math.round(location.rankingScore))).toFixed(1) : '-'}
                    </span>
                    <span className="text-[9px] text-gray-500 font-medium">Rating</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Location Post Library Modal */}
      {selectedLocation && (
        <LocationPostLibrary
          place={{
            id: selectedLocation.id,
            name: selectedLocation.name,
            city: selectedLocation.city,
            address: selectedLocation.address,
            google_place_id: selectedLocation.google_place_id,
            coordinates: selectedLocation.coordinates
          }}
          isOpen={isLibraryOpen}
          onClose={() => {
            setIsLibraryOpen(false);
            setSelectedLocation(null);
          }}
        />
      )}
    </>
  );
};

export default LocationGrid;
