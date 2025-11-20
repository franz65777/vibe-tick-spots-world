import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MapFilter } from '@/contexts/MapFilterContext';

interface MapLocation {
  id: string;
  name: string;
  category: string;
  address?: string;
  city?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  isFollowing?: boolean;
  isNew?: boolean;
  isSaved?: boolean;
  isRecommended?: boolean;
  recommendationScore?: number;
  user_id: string;
  created_at: string;
  sharedByUser?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface UseMapLocationsProps {
  mapFilter: MapFilter;
  selectedCategories: string[];
  currentCity: string;
  selectedFollowedUserIds?: string[];
  selectedSaveTags?: string[];
  mapBounds?: { north: number; south: number; east: number; west: number };
}

// Cache for map locations to avoid redundant queries
const locationCache = new Map<string, { data: MapLocation[]; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export const useMapLocations = ({ mapFilter, selectedCategories, currentCity, selectedFollowedUserIds = [], selectedSaveTags = [], mapBounds }: UseMapLocationsProps) => {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      setLocations([]);
      return;
    }
    
    // Debounce fetch to avoid too many calls
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchLocations();
    }, 300); // 300ms debounce
    
    // Set up realtime subscription for map updates with debouncing
    let refreshTimeout: NodeJS.Timeout | null = null;
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log('🔄 Map data changed, refreshing...');
        fetchLocations();
      }, 1000); // 1 second debounce for realtime
    };
    
    const channel = supabase
      .channel(`map-locations-refresh-${user?.id || 'anon'}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, debouncedRefresh)
      .subscribe();
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [mapFilter, selectedCategories.join(','), currentCity, user?.id, selectedFollowedUserIds.join(','), selectedSaveTags.join(','), mapBounds ? `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}` : '']);

  const fetchLocations = async () => {
    if (!user) return;
    
    // Generate cache key
    const boundsKey = mapBounds ? `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}` : '';
    const cacheKey = `${mapFilter}-${selectedCategories.join(',')}-${currentCity}-${selectedFollowedUserIds.join(',')}-${selectedSaveTags.join(',')}-${boundsKey}`;
    
    // Check cache first
    const cached = locationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log('🗺️ Using cached locations');
      setLocations(cached.data);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      console.log(`🗺️ Fetching ${mapFilter} locations${mapBounds ? ' within map bounds' : currentCity ? ` for city: ${currentCity}` : ''}`);

      let finalLocations: MapLocation[] = [];

      switch (mapFilter) {
        case 'shared': {
          // Fetch active location shares
          let sharesQuery = supabase
            .from('user_location_shares')
            .select(`
              id,
              location_id,
              latitude,
              longitude,
              expires_at,
              user_id,
              created_at,
              location:locations(name, category, city, address)
            `)
            .gt('expires_at', new Date().toISOString());
          
          // Apply bounds filter if provided
          if (mapBounds) {
            sharesQuery = sharesQuery
              .gte('latitude', mapBounds.south)
              .lte('latitude', mapBounds.north)
              .gte('longitude', mapBounds.west)
              .lte('longitude', mapBounds.east);
          }
          
          const { data: shares, error: sharesError } = await sharesQuery.order('created_at', { ascending: false });
          
          if (sharesError) {
            console.error('Error fetching active shares:', sharesError);
            break;
          }

          // Get profile data for users sharing locations
          const userIds = shares?.map(s => s.user_id).filter(Boolean) || [];
          const { data: profiles } = userIds.length > 0 ? await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds) : { data: [] };

          const profileMap = new Map<string, { id: string; username: string; avatar_url: string | null }>(
            profiles?.map(p => [p.id, p] as [string, { id: string; username: string; avatar_url: string | null }]) || []
          );

          finalLocations = (shares || []).map(share => ({
            id: share.location_id || `share-${share.id}`,
            name: share.location?.name || 'Shared Location',
            category: share.location?.category || 'Unknown',
            address: share.location?.address,
            city: share.location?.city,
            coordinates: {
              lat: Number(share.latitude) || 0,
              lng: Number(share.longitude) || 0
            },
            user_id: share.user_id,
            created_at: share.created_at,
            isFollowing: true,
            sharedByUser: profileMap.get(share.user_id)
          })).filter(loc => {
            if (selectedCategories.length > 0 && !selectedCategories.includes(loc.category)) return false;
            return true;
          });
          break;
        }

        case 'following': {
          // When map bounds are provided, fetch locations directly within bounds
          if (mapBounds) {
            const { data: followedUsers } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', user.id);
            
            let followedUserIds = followedUsers?.map(f => f.following_id) || [];
            
            // Filter by specific selected users if provided
            if (selectedFollowedUserIds.length > 0) {
              followedUserIds = followedUserIds.filter(id => selectedFollowedUserIds.includes(id));
            }
            
            if (followedUserIds.length === 0) {
              finalLocations = [];
              break;
            }
            
            // Fetch internal locations within bounds
            const { data: locations } = await supabase
              .from('locations')
              .select('*')
              .in('created_by', followedUserIds)
              .gte('latitude', mapBounds.south)
              .lte('latitude', mapBounds.north)
              .gte('longitude', mapBounds.west)
              .lte('longitude', mapBounds.east)
              .not('latitude', 'is', null)
              .not('longitude', 'is', null);
            
            // Fetch saved places within bounds
            const { data: savedPlaces } = await supabase
              .from('saved_places')
              .select('place_id, created_at, user_id, place:places_cache(id, name, category, city, latitude, longitude)')
              .in('user_id', followedUserIds);
            
            // Convert to MapLocation format
            const fromLocations: MapLocation[] = (locations || []).map((loc: any) => ({
              id: loc.id,
              name: loc.name,
              category: loc.category,
              address: loc.address,
              city: loc.city,
              coordinates: {
                lat: Number(loc.latitude) || 0,
                lng: Number(loc.longitude) || 0,
              },
              isFollowing: true,
              user_id: loc.created_by,
              created_at: loc.created_at,
            }));
            
            const fromSavedPlaces: MapLocation[] = (savedPlaces || [])
              .filter((sp: any) => sp.place?.latitude && sp.place?.longitude)
              .filter((sp: any) => {
                const lat = Number(sp.place.latitude);
                const lng = Number(sp.place.longitude);
                return lat >= mapBounds.south && lat <= mapBounds.north &&
                       lng >= mapBounds.west && lng <= mapBounds.east;
              })
              .map((sp: any) => ({
                id: sp.place_id,
                name: sp.place.name,
                category: sp.place.category || 'Unknown',
                address: undefined,
                city: sp.place.city || undefined,
                coordinates: {
                  lat: Number(sp.place.latitude) || 0,
                  lng: Number(sp.place.longitude) || 0,
                },
                isFollowing: true,
                user_id: sp.user_id,
                created_at: sp.created_at,
              }));
            
            finalLocations = [...fromLocations, ...fromSavedPlaces].filter(loc => {
              if (selectedCategories.length > 0 && !selectedCategories.includes(loc.category)) return false;
              return true;
            });
          } else {
            // Use RPC functions when no bounds (city search)
            const [locRes, placesRes] = await Promise.all([
              supabase.rpc('get_following_saved_locations'),
              supabase.rpc('get_following_saved_places', { limit_count: 200 })
            ]);

            if (locRes.error) {
              console.error('Error fetching following internal locations:', locRes.error);
            }
            if (placesRes.error) {
              console.error('Error fetching following saved places:', placesRes.error);
            }

            const fromLocations: MapLocation[] = (locRes.data as any[] | null)?.map((row: any) => ({
              id: row.id,
              name: row.name,
              category: row.category,
              address: row.address,
              city: row.city,
              coordinates: {
                lat: Number(row.latitude) || 0,
                lng: Number(row.longitude) || 0,
              },
              isFollowing: true,
              user_id: row.created_by,
              created_at: row.created_at,
            })) ?? [];

            const fromSavedPlaces: MapLocation[] = (placesRes.data as any[] | null)?.map((row: any) => {
              const coords = (row.coordinates as any) || {};
              return {
                id: row.place_id,
                name: row.place_name,
                category: row.place_category || 'Unknown',
                address: undefined,
                city: row.city || undefined,
                coordinates: {
                  lat: Number(coords.lat) || 0,
                  lng: Number(coords.lng) || 0,
                },
                isFollowing: true,
                user_id: row.user_id,
                created_at: row.created_at,
              };
            }) ?? [];

            const combined = [...fromLocations, ...fromSavedPlaces];

            // Filter by city and categories
            finalLocations = combined.filter(location => {
              if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) return false;
              if (currentCity && location.city && !location.city.toLowerCase().includes(currentCity.toLowerCase())) return false;
              return true;
            });
          }
          break;
        }

        case 'popular': {
          // Popular locations with bounds or city filter
          let locationsQuery = supabase
            .from('locations')
            .select(`
              id, name, category, address, city, latitude, longitude, created_by, created_at,
              saves:user_saved_locations(count)
            `)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200);

          // Apply bounds filter if provided (prioritize over city filter)
          if (mapBounds) {
            locationsQuery = locationsQuery
              .gte('latitude', mapBounds.south)
              .lte('latitude', mapBounds.north)
              .gte('longitude', mapBounds.west)
              .lte('longitude', mapBounds.east);
          } else if (currentCity && currentCity.trim()) {
            locationsQuery = locationsQuery.ilike('city', `%${currentCity}%`);
          }

          const { data: locations, error: locError } = await locationsQuery;

          if (locError) {
            console.error('Error fetching popular locations:', locError);
            break;
          }

          let placesQuery = supabase
            .from('places_cache')
            .select(`
              id, name, category, city, latitude, longitude,
              saves:saved_places(count)
            `)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200);

          // Apply bounds filter if provided (prioritize over city filter)
          if (mapBounds) {
            placesQuery = placesQuery
              .gte('latitude', mapBounds.south)
              .lte('latitude', mapBounds.north)
              .gte('longitude', mapBounds.west)
              .lte('longitude', mapBounds.east);
          } else if (currentCity && currentCity.trim()) {
            placesQuery = placesQuery.ilike('city', `%${currentCity}%`);
          }

          const { data: places, error: placesError } = await placesQuery;

          if (placesError) {
            console.error('Error fetching popular places:', placesError);
            break;
          }

          const fromLocations: MapLocation[] = (locations || []).map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            category: loc.category,
            address: loc.address,
            city: loc.city,
            coordinates: {
              lat: Number(loc.latitude) || 0,
              lng: Number(loc.longitude) || 0,
            },
            user_id: loc.created_by,
            created_at: loc.created_at,
          }));

          const fromPlaces: MapLocation[] = (places || []).map((place: any) => ({
            id: place.id,
            name: place.name,
            category: place.category || 'Unknown',
            address: undefined,
            city: place.city || 'Unknown',
            coordinates: {
              lat: Number(place.latitude) || 0,
              lng: Number(place.longitude) || 0,
            },
            user_id: user.id,
            created_at: place.created_at || new Date().toISOString(),
          }));

          finalLocations = [...fromLocations, ...fromPlaces].filter(location => {
            if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) {
              return false;
            }
            return true;
          });
          break;
        }

        case 'saved': {
          // User's saved locations with bounds or city filter
          const locationMap = new Map<string, MapLocation>();

          let shouldFetchLocations = true;
          let shouldFetchPlaces = true;

          if (selectedSaveTags.length > 0) {
            if (selectedSaveTags.includes('location') && selectedSaveTags.length === 1) {
              shouldFetchPlaces = false;
            } else if (selectedSaveTags.includes('place') && selectedSaveTags.length === 1) {
              shouldFetchLocations = false;
            }
          }

          // Fetch internal saved locations
          if (shouldFetchLocations) {
            let savedLocationsQuery = supabase
              .from('user_saved_locations')
              .select(`
                location_id,
                save_tag,
                created_at,
                location:locations (
                  id, name, category, address, city, latitude, longitude, created_by
                )
              `)
              .eq('user_id', user.id)
              .not('location', 'is', null);

            if (selectedSaveTags.length > 0 && !selectedSaveTags.includes('location')) {
              savedLocationsQuery = savedLocationsQuery.in('save_tag', selectedSaveTags);
            }

            const { data: savedLocations } = await savedLocationsQuery;

            (savedLocations || []).forEach((sl: any) => {
              const loc = sl.location;
              if (!loc?.latitude || !loc?.longitude) return;
              
              const lat = Number(loc.latitude);
              const lng = Number(loc.longitude);
              
              // Apply bounds filter if provided
              if (mapBounds) {
                if (lat < mapBounds.south || lat > mapBounds.north ||
                    lng < mapBounds.west || lng > mapBounds.east) {
                  return;
                }
              } else if (currentCity && currentCity.trim()) {
                // Apply city filter only if no bounds
                if (!loc.city || !loc.city.toLowerCase().includes(currentCity.toLowerCase())) {
                  return;
                }
              }

              const key = loc.id || sl.location_id;
              if (key && !locationMap.has(key)) {
                locationMap.set(key, {
                  id: key,
                  name: loc.name,
                  category: loc.category || 'Unknown',
                  address: loc.address,
                  city: loc.city,
                  coordinates: { lat, lng },
                  isSaved: true,
                  user_id: loc.created_by || user.id,
                  created_at: sl.created_at
                });
              }
            });
          }

          // Fetch Google saved places
          if (shouldFetchPlaces) {
            let savedPlacesQuery = supabase
              .from('saved_places')
              .select(`
                place_id,
                save_tag,
                created_at,
                place:places_cache (
                  id, name, category, city, latitude, longitude, coordinates
                )
              `)
              .eq('user_id', user.id)
              .not('place', 'is', null);

            if (selectedSaveTags.length > 0 && !selectedSaveTags.includes('place')) {
              savedPlacesQuery = savedPlacesQuery.in('save_tag', selectedSaveTags);
            }

            const { data: savedPlaces } = await savedPlacesQuery;

            (savedPlaces || []).forEach((sp: any) => {
              const place = sp.place;
              if (!place?.latitude || !place?.longitude) return;
              
              const coords = place.coordinates as any || {};
              const lat = Number(place.latitude) || Number(coords.lat);
              const lng = Number(place.longitude) || Number(coords.lng);
              
              // Apply bounds filter if provided
              if (mapBounds) {
                if (lat < mapBounds.south || lat > mapBounds.north ||
                    lng < mapBounds.west || lng > mapBounds.east) {
                  return;
                }
              } else if (currentCity && currentCity.trim()) {
                // Apply city filter only if no bounds
                if (!place.city || !place.city.toLowerCase().includes(currentCity.toLowerCase())) {
                  return;
                }
              }

              const key = sp.place_id;
              if (key && !locationMap.has(key)) {
                locationMap.set(key, {
                  id: sp.place_id,
                  name: place.name,
                  category: place.category || 'Unknown',
                  address: '',
                  city: place.city || 'Unknown',
                  coordinates: { lat, lng },
                  isSaved: true,
                  user_id: user.id,
                  created_at: sp.created_at
                });
              }
            });
          }

          finalLocations = Array.from(locationMap.values())
            .filter(location => {
              if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) {
                return false;
              }
              return true;
            });
          break;
        }
      }

      // Filter out locations with invalid coordinates
      finalLocations = finalLocations.filter((location) => {
        const { lat, lng } = location.coordinates || { lat: 0, lng: 0 };
        return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
      });

      console.log(`✅ Found ${finalLocations.length} ${mapFilter} locations`);
      
      // Cache the results
      locationCache.set(cacheKey, {
        data: finalLocations,
        timestamp: Date.now()
      });
      
      setLocations(finalLocations);

    } catch (err: any) {
      console.error('❌ Error fetching map locations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations
  };
};
