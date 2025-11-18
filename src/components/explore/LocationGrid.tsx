import React, { useState, useEffect } from 'react';

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
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';

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

  // Listen for global save tag changes
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved, saveTag } = event.detail;
      
      setUserSavedIds(prev => {
        const newSet = new Set(prev);
        if (isSaved) {
          newSet.add(locationId);
        } else {
          newSet.delete(locationId);
        }
        return newSet;
      });

      if (isSaved && saveTag) {
        setSaveTags(prev => ({ ...prev, [locationId]: saveTag }));
      } else if (!isSaved) {
        setSaveTags(prev => {
          const newTags = { ...prev };
          delete newTags[locationId];
          return newTags;
        });
      }
    };

    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, []);

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
      setSaveTags(cachedLocations.saveTags || {});
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsData = async () => {
    if (!user) return { locations: [], userSavedIds: new Set<string>(), saveTags: {} };

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

      // Track which locations the current user has saved + their save tags
      const finalUserSavedIds = new Set<string>();
      const finalSaveTags: Record<string, SaveTag> = {};
      
      // Get user's save tags from user_saved_locations
      const { data: userSaveTagsData } = await supabase
        .from('user_saved_locations')
        .select('location_id, save_tag')
        .eq('user_id', user.id);
      
      const userSaveTagsMap = new Map<string, string>();
      userSaveTagsData?.forEach(s => {
        userSaveTagsMap.set(s.location_id, s.save_tag || 'general');
      });
      
      // Get user's save tags from saved_places
      const { data: savedPlaceTagsData } = await supabase
        .from('saved_places')
        .select('place_id, save_tag')
        .eq('user_id', user.id);
      
      const savedPlaceTagsMap = new Map<string, string>();
      savedPlaceTagsData?.forEach(s => {
        savedPlaceTagsMap.set(s.place_id, s.save_tag || 'general');
      });
      
      groups.forEach((g) => {
        const userSavedLocation = g.allLocationIds.some((id) =>
          savesData?.some((s) => s.location_id === id && s.user_id === user?.id)
        );
        const userSavedPlace = g.google_place_id && savedPlacesCountData?.some(
          (s) => s.place_id === g.google_place_id && s.user_id === user?.id
        );
        
        if (userSavedLocation || userSavedPlace) {
          finalUserSavedIds.add(g.id);
          
          // Find the save tag for this location
          let saveTag: string = 'general';
          for (const locId of g.allLocationIds) {
            if (userSaveTagsMap.has(locId)) {
              saveTag = userSaveTagsMap.get(locId)!;
              break;
            }
          }
          if (g.google_place_id && savedPlaceTagsMap.has(g.google_place_id)) {
            saveTag = savedPlaceTagsMap.get(g.google_place_id)!;
          }
          finalSaveTags[g.id] = saveTag as SaveTag;
        }
      });
      
      setUserSavedIds(finalUserSavedIds);
      setSaveTags(finalSaveTags);

      // Sort by saves count (most popular first) and strip internal fields
      const uniqueLocations = Array.from(groups.values())
        .map(({ allLocationIds, nameCityKey, gpKey, ...rest }) => rest)
        .sort((a, b) => b.savesCount - a.savesCount);

      return {
        locations: uniqueLocations,
        userSavedIds: finalUserSavedIds,
        saveTags: finalSaveTags
      };
  };

  const handleLocationClick = (location: LocationCard) => {
    setSelectedLocation(location);
    setIsLibraryOpen(true);
  };

  const handleSaveWithTag = async (locationId: string, tag: SaveTag) => {
    if (!user) return;
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    try {
      await locationInteractionService.saveLocation(locationId, {
        google_place_id: location.google_place_id,
        name: location.name,
        address: location.address,
        latitude: location.coordinates.lat,
        longitude: location.coordinates.lng,
        category: location.category,
        types: []
      }, tag);

      setUserSavedIds(prev => new Set([...prev, locationId]));
      setSaveTags(prev => ({ ...prev, [locationId]: tag }));

      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', {
        detail: { locationId, isSaved: true, saveTag: tag }
      }));
      if (location.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: location.google_place_id, isSaved: true, saveTag: tag }
        }));
      }

      // Clear cache and refresh
      const cacheKey = `locations-grid-${searchQuery || 'all'}-${selectedCategory || 'all'}-${user.id}`;
      clearCache(cacheKey);
      fetchLocations();
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const handleUnsave = async (locationId: string) => {
    if (!user) return;
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    try {
      await locationInteractionService.unsaveLocation(locationId);

      setUserSavedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(locationId);
        return newSet;
      });
      setSaveTags(prev => {
        const newTags = { ...prev };
        delete newTags[locationId];
        return newTags;
      });

      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', {
        detail: { locationId, isSaved: false }
      }));
      if (location.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: location.google_place_id, isSaved: false }
        }));
      }

      // Clear cache and refresh
      const cacheKey = `locations-grid-${searchQuery || 'all'}-${selectedCategory || 'all'}-${user.id}`;
      clearCache(cacheKey);
      fetchLocations();
    } catch (error) {
      console.error('Error unsaving location:', error);
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
               className={`relative bg-white dark:bg-card rounded-2xl cursor-pointer transition-all flex flex-col h-[140px] ${
                hasCampaign 
                  ? 'campaign-border overflow-visible' 
                  : 'border border-border overflow-hidden'
              }`}
            >
              {/* Top section with category, mute, and save */}
              <div className="relative p-2.5 flex items-start justify-between">
                <CategoryIcon category={location.category} className={location.category.toLowerCase() === 'hotel' || location.category.toLowerCase() === 'restaurant' ? 'w-9 h-9' : 'w-7 h-7'} />
                
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <SaveLocationDropdown
                    isSaved={isSaved}
                    onSave={(tag) => handleSaveWithTag(location.id, tag)}
                    onUnsave={() => handleUnsave(location.id)}
                    currentSaveTag={saveTags[location.id] || 'general'}
                    variant="ghost"
                    size="icon"
                  />
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
                    <span className="text-[10px] text-muted-foreground">posts</span>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    <span className="text-[11px] font-semibold text-foreground">{location.savesCount || 0}</span>
                    <span className="text-[10px] text-muted-foreground">saved</span>
                  </div>
                  
                  {location.rankingScore && (
                    <div className="flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-[11px] font-semibold text-foreground">
                        {Math.min(10, Math.max(1, Math.round(location.rankingScore))).toFixed(1)}
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
