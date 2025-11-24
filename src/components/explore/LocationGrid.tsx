import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LocationPostLibrary from './LocationPostLibrary';
import { AllowedCategory, categoryDisplayNames } from '@/utils/allowedCategories';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import CityLabel from '@/components/common/CityLabel';
import { getCachedData, clearCache } from '@/services/performanceService';
import { normalizeCity } from '@/utils/cityNormalization';
import { reverseTranslateCityName } from '@/utils/cityTranslations';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { SAVE_TAG_OPTIONS, type SaveTag } from '@/utils/saveTags';
import { locationInteractionService } from '@/services/locationInteractionService';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

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
  const { t } = useTranslation();
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(user?.id);
  const [locations, setLocations] = useState<LocationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationCard | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [userSavedIds, setUserSavedIds] = useState<Set<string>>(new Set());
  const [campaignLocationIds, setCampaignLocationIds] = useState<Set<string>>(new Set());
  const [saveTags, setSaveTags] = useState<Record<string, SaveTag>>({});

  useEffect(() => {
    fetchLocations();
    fetchActiveCampaigns();
  }, [searchQuery, selectedCategory, user?.id]);

  const fetchActiveCampaigns = async () => {
    try {
      const { data } = await supabase
        .from('marketing_campaigns')
        .select('location_id')
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString());
      
      if (data) {
        setCampaignLocationIds(new Set(data.map(c => c.location_id)));
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

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
      // Support reverse translation for searching (e.g., searching "Milano" finds "Milan")
      if (searchQuery && searchQuery.trim()) {
        const normalizedSearch = normalizeCity(searchQuery.trim());
        const englishCityName = reverseTranslateCityName(searchQuery.trim());
        
        // Global city search: text-based with support for all city names
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,city.ilike.%${normalizedSearch}%,city.ilike.%${englishCityName}%,address.ilike.%${searchQuery}%`);
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

      // Internal location IDs (only real locations table, no Google place IDs)
      const internalLocationIds = (locationsData || []).map(l => l.id);

      // Get ALL saves for these internal locations (from all users)
      let savesData: any[] | null = null;
      if (internalLocationIds.length > 0) {
        const { data } = await supabase
          .from('user_saved_locations')
          .select('location_id, user_id')
          .in('location_id', internalLocationIds);
        savesData = data;
      }

      // Also count saves from saved_places table (by Google place id)
      const placeIds = allLocations.map(l => l.google_place_id).filter(Boolean);
      const { data: savedPlacesCountData } = await supabase
        .from('saved_places')
        .select('place_id, user_id')
        .in('place_id', placeIds);

      // Build internal location IDs set for posts/ratings
      const allRelatedLocationIds = new Set<string>(internalLocationIds);
      
      // Find all locations with matching google_place_ids
      if (placeIds.length > 0) {
        const { data: relatedLocations } = await supabase
          .from('locations')
          .select('id')
          .in('google_place_id', placeIds);
        
        relatedLocations?.forEach(loc => allRelatedLocationIds.add(loc.id));
      }
      
      const allIdsArray = Array.from(allRelatedLocationIds);

      // Fetch posts count (and ratings from posts) for ALL related locations
      const { data: postsData } = await supabase
        .from('posts')
        .select('location_id, id, rating')
        .in('location_id', allIdsArray);

      // Fetch ratings from interactions table for ALL related locations
      const { data: ratingsData } = await supabase
        .from('interactions')
        .select('location_id, weight')
        .in('location_id', allIdsArray)
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

      // Calculate average rating by location_id (from interactions AND posts)
      const ratingsMap = new Map<string, number>();
      const ratingsByLocation = new Map<string, number[]>();

      if (ratingsData && ratingsData.length > 0) {
        ratingsData.forEach(r => {
          const locId = r.location_id as string;
          if (!locId) return;
          if (!ratingsByLocation.has(locId)) {
            ratingsByLocation.set(locId, []);
          }
          ratingsByLocation.get(locId)!.push(Number(r.weight));
        });
      }

      if (postsData && postsData.length > 0) {
        postsData.forEach(post => {
          const locId = post.location_id as string | null;
          const rating = (post as any).rating;
          if (!locId || rating == null) return;
          const numeric = Number(rating);
          if (!numeric || numeric <= 0) return;
          if (!ratingsByLocation.has(locId)) {
            ratingsByLocation.set(locId, []);
          }
          ratingsByLocation.get(locId)!.push(numeric);
        });
      }

      ratingsByLocation.forEach((ratings, locationId) => {
        if (ratings.length === 0) return;
        const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        ratingsMap.set(locationId, Math.round(avg * 10) / 10);
      });

      // Group by canonical place using google_place_id when available,
      // otherwise fall back to normalized name + city. Also link records that
      // share the same name+city with a record that has a google_place_id.
      type Grouped = LocationCard & { allLocationIds: string[]; nameCityKey: string; gpKey?: string };
      const groups = new Map<string, Grouped>(); // canonical key -> group
      const nameCityIndex = new Map<string, string>(); // nameCityKey -> canonical key

      // More strict normalization to prevent false matches between different locations
      const norm = (s?: string | null) => {
        if (!s) return '';
        return s.toLowerCase()
          .replace(/[^a-z0-9\s]+/g, '') // Keep spaces
          .replace(/\s+/g, ' ')  // Normalize multiple spaces
          .trim();
      };
      
      const toNameCityKey = (loc: any) => {
        const cityFromAddr = loc.address?.split(',')[1]?.trim();
        const nameKey = norm(loc.name);
        const cityKey = norm(loc.city || cityFromAddr);
        // Include first 3 chars of address for additional uniqueness
        const addrKey = norm(loc.address)?.substring(0, 20) || '';
        return `${nameKey}|${cityKey}|${addrKey}`;
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
        // Collect ALL ratings from all location IDs (not average of averages)
        const allRatings: number[] = [];
        g.allLocationIds.forEach(id => {
          const locationRatings = ratingsByLocation.get(id);
          if (locationRatings && locationRatings.length > 0) {
            allRatings.push(...locationRatings);
          }
        });
        
        if (allRatings.length > 0) {
          const avgRating = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
          g.rankingScore = Math.round(avgRating * 10) / 10;
        }
      });

      // Debug specific location stats
      const debugLocation = Array.from(groups.values()).find(g => g.name === 'Nalu Restaurant & Lounge');
      if (debugLocation) {
        console.log('LocationGrid debug - Nalu Restaurant & Lounge', {
          postsCount: debugLocation.postsCount,
          savesCount: debugLocation.savesCount,
          rankingScore: debugLocation.rankingScore,
          allLocationIds: debugLocation.allLocationIds,
        });
      }

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
      <div className="flex flex-col items-center justify-center py-16 px-1">
        <div className="text-center">
          <p className="text-gray-500">No locations found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 px-[10px] py-3 pb-16">
        {locations.map((location) => {
          const isSaved = userSavedIds.has(location.id);
          const isMuted = mutedLocations?.some((m: any) => m.location_id === location.id);
          const hasCampaign = campaignLocationIds.has(location.id);
          
          return (
            <div
              key={location.id}
              onClick={() => handleLocationClick(location)}
              className="relative backdrop-blur-xl rounded-2xl cursor-pointer transition-all flex flex-col h-[140px] overflow-visible border-[1.5px] border-transparent
                [background-image:linear-gradient(rgba(229,229,229,0.35),rgba(229,229,229,0.35)),linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))]
                dark:[background-image:linear-gradient(rgba(30,41,59,0.6),rgba(30,41,59,0.6)),linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))]
                [background-origin:border-box] [background-clip:padding-box,border-box]"
            >
              {/* Fireworks effect for campaigns */}
              {hasCampaign && (
                <div className="absolute -top-1 -left-1 z-20 pointer-events-none">
                  <div className="relative w-10 h-10">
                    <div className="absolute top-0 left-3 w-2 h-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 animate-[sparkle-float_1.8s_ease-in-out_infinite] shadow-lg"></div>
                    <div className="absolute top-2 right-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-red-400 to-orange-400 animate-[sparkle-float_1.8s_ease-in-out_0.3s_infinite] shadow-lg"></div>
                    <div className="absolute top-1 left-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-teal-400 to-green-500 animate-[sparkle-float_1.8s_ease-in-out_0.6s_infinite] shadow-lg"></div>
                    <div className="absolute top-4 left--1 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-green-300 to-yellow-300 animate-[sparkle-float_1.8s_ease-in-out_0.9s_infinite] shadow-lg"></div>
                    <div className="absolute top-4 right--1 w-1 h-1 rounded-full bg-gradient-to-br from-pink-400 to-red-500 animate-[sparkle-float_1.8s_ease-in-out_1.2s_infinite] shadow-lg"></div>
                  </div>
                </div>
              )}
              {/* Top section with category, mute, and save */}
              <div className="relative p-2.5 flex items-start justify-between">
                <CategoryIcon 
                  category={location.category} 
                  className={location.category.toLowerCase() === 'hotel' || location.category.toLowerCase() === 'restaurant' ? 'w-9 h-9' : 'w-7 h-7'}
                  sizeMultiplier={
                    location.category.toLowerCase() === 'restaurant' ? 0.8 : 
                    location.category.toLowerCase() === 'hotel' ? 0.9 : 
                    1
                  }
                />
                
                <div className="flex items-center gap-1.5">
                  
                  <button
                    onClick={(e) => handleSaveToggle(e, location.id)}
                    className={`rounded-full p-1.5 transition-all ${
                      isSaved 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                    aria-label={isSaved ? 'Unsave location' : 'Save location'}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-2.5 flex-1 flex flex-col justify-between pb-2.5">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight">
                    {location.name}
                  </h4>
                  
                  {/* City */}
                  <div className="flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[11px] text-muted-foreground truncate">
                      <CityLabel id={location.google_place_id || location.id} city={location.city} address={location.address} coordinates={location.coordinates} />
                    </span>
                  </div>
                </div>

                {/* Ultra Minimal Stats - Compact Row */}
                <div className="flex items-center gap-3 pt-1.5">
                  <div className="flex items-center gap-0.5">
                    <span className="text-[11px] font-semibold text-foreground">{location.postsCount || 0}</span>
                    <span className="text-[10px] text-muted-foreground">{t('posts', { ns: 'common' })}</span>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    <span className="text-[11px] font-semibold text-foreground">{location.savesCount || 0}</span>
                    <span className="text-[10px] text-muted-foreground">{t('saved', { ns: 'common' })}</span>
                  </div>
                  
                  {location.rankingScore != null && location.rankingScore > 0 && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0",
                        getRatingFillColor(location.rankingScore) + "/10"
                      )}
                    >
                      {(() => {
                        const CategoryIconComp = location.category
                          ? getCategoryIcon(location.category as any)
                          : Star;
                        return (
                          <CategoryIconComp
                            className={cn(
                              "w-2.5 h-2.5",
                              getRatingFillColor(location.rankingScore),
                              getRatingColor(location.rankingScore)
                            )}
                          />
                        );
                      })()}
                      <span
                        className={cn(
                          "text-[11px] font-semibold",
                          getRatingColor(location.rankingScore)
                        )}
                      >
                        {Math.min(10, Math.max(1, location.rankingScore)).toFixed(1)}
                      </span>
                    </div>
                  )}
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
