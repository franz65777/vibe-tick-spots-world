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
  google_place_id?: string;
  opening_hours_data?: any;
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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useMapLocations = ({ mapFilter, selectedCategories, currentCity, selectedFollowedUserIds = [], selectedSaveTags = [], mapBounds }: UseMapLocationsProps) => {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false); // Start with false - only true for actual fetches
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setLocations([]);
      return;
    }
    
    // Debounce fetch - use shorter delay for initial fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    const delay = initialFetchDoneRef.current ? 200 : 50; // Faster initial fetch
    fetchTimeoutRef.current = setTimeout(() => {
      fetchLocations();
      initialFetchDoneRef.current = true;
    }, delay);
    
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_saved_locations' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, debouncedRefresh)
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
    const boundsKey = mapBounds ? `${mapBounds.north.toFixed(4)},${mapBounds.south.toFixed(4)},${mapBounds.east.toFixed(4)},${mapBounds.west.toFixed(4)}` : '';
    const cacheKey = `${mapFilter}-${selectedCategories.join(',')}-${currentCity}-${selectedFollowedUserIds.join(',')}-${selectedSaveTags.join(',')}-${boundsKey}`;
    
    // Check cache first - if valid, return immediately without loading state
    const cached = locationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log('🗺️ Using cached locations (instant)');
      setLocations(cached.data);
      return;
    }
    
    // Only show loading for non-cached requests
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

          // Keep only the most recent share per user (query is ordered by created_at DESC)
          const uniqueSharesByUser = new Map<string, typeof shares[0]>();
          for (const share of (shares || [])) {
            if (!uniqueSharesByUser.has(share.user_id)) {
              uniqueSharesByUser.set(share.user_id, share);
            }
          }
          const dedupedShares = Array.from(uniqueSharesByUser.values());

          finalLocations = dedupedShares.map(share => ({
            id: share.location_id || `share-${share.id}`,
            name: share.location?.name || 'Shared Location',
            category: share.location?.category || 'Unknown',
            address: share.location?.address,
            city: share.location?.city,
            google_place_id: (share.location as any)?.google_place_id || undefined,
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
              .select('place_id, created_at, user_id, place_name, place_category, city, coordinates')
              .in('user_id', followedUserIds);
            
            // Build set of google_place_ids from locations to detect duplicates
            const googlePlaceIdsInLocations = new Set<string>();
            (locations || []).forEach((loc: any) => {
              if (loc.google_place_id) {
                googlePlaceIdsInLocations.add(loc.google_place_id);
              }
            });
            
            // Convert to MapLocation format
            const fromLocations: MapLocation[] = (locations || []).map((loc: any) => ({
              id: loc.id,
              name: loc.name,
              category: loc.category,
              address: loc.address,
              city: loc.city,
              google_place_id: loc.google_place_id,
              coordinates: {
                lat: Number(loc.latitude) || 0,
                lng: Number(loc.longitude) || 0,
              },
              isFollowing: true,
              user_id: loc.created_by,
              created_at: loc.created_at,
            }));
            
            // Convert saved places to MapLocation format, filtering duplicates and bounds
            const fromSavedPlaces: MapLocation[] = (savedPlaces || [])
              .filter((sp: any) => {
                // Skip duplicates
                if (googlePlaceIdsInLocations.has(sp.place_id)) return false;
                
                const coords = sp.coordinates as any || {};
                const lat = Number(coords.lat);
                const lng = Number(coords.lng);
                
                if (!lat || !lng) return false;
                
                // Check bounds
                return lat >= mapBounds.south && lat <= mapBounds.north &&
                       lng >= mapBounds.west && lng <= mapBounds.east;
              })
              .map((sp: any) => {
                const coords = sp.coordinates as any || {};
                return {
                  id: sp.place_id,
                  name: sp.place_name || 'Unknown',
                  category: sp.place_category || 'Unknown',
                  address: undefined,
                  city: sp.city || undefined,
                  google_place_id: sp.place_id,
                  coordinates: {
                    lat: Number(coords.lat) || 0,
                    lng: Number(coords.lng) || 0,
                  },
                  isFollowing: true,
                  user_id: sp.user_id,
                  created_at: sp.created_at,
                };
              });
            
            finalLocations = [...fromLocations, ...fromSavedPlaces].filter(loc => {
              if (selectedCategories.length > 0 && !selectedCategories.includes(loc.category)) return false;
              return true;
            });
          } else {
            // Use RPC functions when no bounds (city search)
            // Use only get_following_saved_locations RPC (no saved_places to avoid duplicates)
            const { data: followingLocations, error: locError } = await supabase.rpc('get_following_saved_locations');

            if (locError) {
              console.error('Error fetching following internal locations:', locError);
            }

            const fromLocations: MapLocation[] = (followingLocations as any[] | null)?.map((row: any) => ({
              id: row.id,
              name: row.name,
              category: row.category,
              address: row.address,
              city: row.city,
              google_place_id: row.google_place_id,
              coordinates: {
                lat: Number(row.latitude) || 0,
                lng: Number(row.longitude) || 0,
              },
              isFollowing: true,
              user_id: row.created_by,
              created_at: row.created_at,
            })) ?? [];

            // Filter by city and categories
            finalLocations = fromLocations.filter(location => {
              if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) return false;
              if (currentCity && location.city && !location.city.toLowerCase().includes(currentCity.toLowerCase())) return false;
              return true;
            });
          }
          break;
        }

        case 'popular': {
          // POPULAR / "Tutti" filter: show ALL saved locations (from locations + saved_places)
          // Get followed user IDs for weighted scoring
          const { data: followedUsers } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
          
          const followedUserIds = followedUsers?.map(f => f.following_id) || [];

          // ---------------------- 1) Fetch saved_places ----------------------
          // These may have coordinates stored in JSONB - fetch ALL saved_places (global)
          // Apply bounds or city filter afterward in JS
          let savedPlacesQuery = supabase
            .from('saved_places')
            .select('place_id, place_name, place_category, city, coordinates, user_id, created_at');

          // City filter (saved_places has a city column)
          if (!mapBounds && currentCity && currentCity.trim()) {
            savedPlacesQuery = savedPlacesQuery.ilike('city', `%${currentCity}%`);
          }

          const { data: savedPlaces } = await savedPlacesQuery.limit(1000);

          // Build a map of google_place_id -> saved_places data
          const savedPlacesMap = new Map<string, any>();
          const savedPlaceScores = new Map<string, number>();
          (savedPlaces || []).forEach((sp: any) => {
            const coords = sp.coordinates as any;
            const lat = Number(coords?.lat);
            const lng = Number(coords?.lng);
            if (!lat || !lng) return;

            // Bounds check
            if (mapBounds) {
              if (lat < mapBounds.south || lat > mapBounds.north ||
                  lng < mapBounds.west || lng > mapBounds.east) {
                return;
              }
            }

            // Score (weight by followed)
            const weight = followedUserIds.includes(sp.user_id) ? 3 : 1;
            savedPlaceScores.set(sp.place_id, (savedPlaceScores.get(sp.place_id) || 0) + weight);

            // Store first occurrence of each google_place_id
            if (!savedPlacesMap.has(sp.place_id)) {
              savedPlacesMap.set(sp.place_id, sp);
            }
          });

          // ---------------------- 2) Fetch from locations table ----------------------
          let locationsQuery = supabase
            .from('locations')
            .select('id, name, category, address, city, latitude, longitude, created_by, created_at, google_place_id, opening_hours_data')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

          if (mapBounds) {
            locationsQuery = locationsQuery
              .gte('latitude', mapBounds.south)
              .lte('latitude', mapBounds.north)
              .gte('longitude', mapBounds.west)
              .lte('longitude', mapBounds.east);
          } else if (currentCity && currentCity.trim()) {
            locationsQuery = locationsQuery.ilike('city', `%${currentCity}%`);
          }

          const { data: locations, error: locError } = await locationsQuery.limit(500);

          if (locError) {
            console.error('Error fetching popular locations:', locError);
            break;
          }

          const locationIds = (locations || []).map(l => l.id);
          const googlePlaceIdsFromLocations = new Set(
            (locations || []).map(l => l.google_place_id).filter(Boolean)
          );

          // Fetch saves from user_saved_locations for locations table entries
          const [locationSavesRes, locationPostsRes] = await Promise.all([
            locationIds.length > 0 
              ? supabase.from('user_saved_locations').select('location_id, user_id').in('location_id', locationIds)
              : { data: [] },
            locationIds.length > 0
              ? supabase.from('posts').select('location_id').in('location_id', locationIds)
              : { data: [] }
          ]);

          const locationSaves = locationSavesRes.data || [];
          const locationPosts = locationPostsRes.data || [];

          // Calculate scores for internal locations
          const locationScores = new Map<string, number>();
          
          locationSaves.forEach((save: any) => {
            const score = locationScores.get(save.location_id) || 0;
            const weight = followedUserIds.includes(save.user_id) ? 3 : 1;
            locationScores.set(save.location_id, score + weight);
          });

          // Also add scores from saved_places if google_place_id matches a location
          (locations || []).forEach((loc: any) => {
            if (loc.google_place_id && savedPlaceScores.has(loc.google_place_id)) {
              const addScore = savedPlaceScores.get(loc.google_place_id) || 0;
              locationScores.set(loc.id, (locationScores.get(loc.id) || 0) + addScore);
              // Mark as used so we don't duplicate later
              googlePlaceIdsFromLocations.add(loc.google_place_id);
            }
          });
          
          // Add points for posts
          locationPosts.forEach((post: any) => {
            const score = locationScores.get(post.location_id) || 0;
            locationScores.set(post.location_id, score + 0.5);
          });

          // ---------------------- 3) Build final array ----------------------
          // From locations table
          const fromLocations: MapLocation[] = (locations || [])
            .filter((loc: any) => (locationScores.get(loc.id) || 0) > 0)
            .map((loc: any) => ({
              id: loc.id,
              name: loc.name,
              category: loc.category,
              address: loc.address,
              city: loc.city,
              google_place_id: loc.google_place_id,
              opening_hours_data: loc.opening_hours_data,
              coordinates: {
                lat: Number(loc.latitude) || 0,
                lng: Number(loc.longitude) || 0,
              },
              user_id: loc.created_by,
              created_at: loc.created_at,
              recommendationScore: locationScores.get(loc.id) || 0,
            }));

          // From saved_places that are NOT already in locations table
          const fromSavedPlaces: MapLocation[] = [];
          savedPlacesMap.forEach((sp, googlePlaceId) => {
            // Skip if already represented in locations
            if (googlePlaceIdsFromLocations.has(googlePlaceId)) return;

            const coords = sp.coordinates as any;
            const lat = Number(coords?.lat);
            const lng = Number(coords?.lng);
            if (!lat || !lng) return;

            fromSavedPlaces.push({
              id: googlePlaceId, // use google_place_id as id
              name: sp.place_name || 'Unknown',
              category: sp.place_category || 'restaurant',
              address: undefined,
              city: sp.city || undefined,
              google_place_id: googlePlaceId,
              coordinates: { lat, lng },
              user_id: sp.user_id,
              created_at: sp.created_at,
              recommendationScore: savedPlaceScores.get(googlePlaceId) || 1,
            });
          });

          // Combine and sort
          finalLocations = [...fromLocations, ...fromSavedPlaces]
            .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
            .slice(0, 300)
            .filter(location => {
              if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) {
                return false;
              }
              return true;
            });
          
          console.log(`✅ Found ${finalLocations.length} popular locations (includes saved_places not in locations table)`);
          break;
        }

        case 'saved': {
          // User's saved locations - merge intelligently to avoid duplicates
          const locationMap = new Map<string, MapLocation>();

          // 1. Fetch internal saved locations
          let savedLocationsQuery = supabase
            .from('user_saved_locations')
            .select(`
              location_id,
              save_tag,
              created_at,
              location:locations (
                id, name, category, address, city, latitude, longitude, created_by, google_place_id, opening_hours_data
              )
            `)
            .eq('user_id', user.id)
            .not('location', 'is', null);

          if (selectedSaveTags.length > 0) {
            savedLocationsQuery = savedLocationsQuery.in('save_tag', selectedSaveTags);
          }

          const { data: savedLocations } = await savedLocationsQuery;

          // Add locations to map first (priority source)
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
                google_place_id: loc.google_place_id,
                coordinates: { lat, lng },
                isSaved: true,
                user_id: loc.created_by || user.id,
                created_at: sl.created_at
              });
            }
          });

          // 2. Fetch Google saved places
          let savedPlacesQuery = supabase
            .from('saved_places')
            .select('place_id, place_name, place_category, city, coordinates, user_id, created_at, save_tag')
            .eq('user_id', user.id);

          if (selectedSaveTags.length > 0) {
            savedPlacesQuery = savedPlacesQuery.in('save_tag', selectedSaveTags);
          }

          const { data: savedPlaces } = await savedPlacesQuery;

          // 3. Build a set of google_place_ids already in locations to detect duplicates
          const googlePlaceIdsInLocations = new Set<string>();
          (savedLocations || []).forEach((sl: any) => {
            if (sl.location?.google_place_id) {
              googlePlaceIdsInLocations.add(sl.location.google_place_id);
            }
          });

          // 4. Add saved places ONLY if they don't duplicate a location (by google_place_id)
          (savedPlaces || []).forEach((sp: any) => {
            // Skip if this place_id matches a google_place_id already added from locations
            if (googlePlaceIdsInLocations.has(sp.place_id)) {
              console.log(`Skipping duplicate: ${sp.place_name} (already in locations)`);
              return;
            }

            const coords = sp.coordinates as any || {};
            const lat = Number(coords.lat);
            const lng = Number(coords.lng);
            
            if (!lat || !lng) return;
            
            // Apply bounds filter if provided
            if (mapBounds) {
              if (lat < mapBounds.south || lat > mapBounds.north ||
                  lng < mapBounds.west || lng > mapBounds.east) {
                return;
              }
            } else if (currentCity && currentCity.trim()) {
              if (!sp.city || !sp.city.toLowerCase().includes(currentCity.toLowerCase())) {
                return;
              }
            }

            const key = sp.place_id;
            if (key && !locationMap.has(key)) {
              locationMap.set(key, {
                id: sp.place_id,
                name: sp.place_name || 'Unknown',
                category: sp.place_category || 'Unknown',
                address: undefined,
                city: sp.city || 'Unknown',
                google_place_id: sp.place_id,
                coordinates: { lat, lng },
                isSaved: true,
                user_id: sp.user_id,
                created_at: sp.created_at
              });
            }
          });

          finalLocations = Array.from(locationMap.values())
            .filter(location => {
              if (selectedCategories.length > 0 && !selectedCategories.includes(location.category)) {
                return false;
              }
              return true;
            });
          
          console.log(`✅ Merged saved locations: ${finalLocations.length} total (no duplicates via google_place_id)`);
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
