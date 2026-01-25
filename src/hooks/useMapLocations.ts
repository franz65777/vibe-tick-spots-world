import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MapFilter } from '@/contexts/MapFilterContext';
import { normalizeCategoryToBase } from '@/utils/normalizeCategoryToBase';
import { resolveCityDisplay } from '@/utils/cityNormalization';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';
import { coalesce } from '@/lib/requestCoalescing';

interface MapLocation {
  id: string;
  name: string;
  category: string;
  address?: string;
  city?: string;
  google_place_id?: string;
  opening_hours_data?: any;
  photos?: string[];
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
  // For friend pins with avatar display
  savedByUser?: {
    id: string;
    username: string;
    avatar_url: string | null;
    action: 'saved' | 'liked' | 'faved' | 'posted';
  };
  // For activity bubble above pins
  latestActivity?: {
    type: 'review' | 'photo';
    snippet?: string;
    created_at: string;
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
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced refresh function for realtime events
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Map data changed via centralized realtime, refreshing...');
      fetchLocations();
    }, 1000); // 1 second debounce
  }, []);

  // Use centralized realtime instead of per-hook channels - reduces connections by 80%+
  useRealtimeEvent(
    ['saved_location_insert', 'saved_location_delete', 'saved_place_insert', 'saved_place_delete'],
    debouncedRefresh
  );

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
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [mapFilter, selectedCategories.join(','), currentCity, user?.id, selectedFollowedUserIds.join(','), selectedSaveTags.join(','), mapBounds ? `${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}` : '']);

  const fetchLocations = async () => {
    if (!user) return;

    const normalizedSelectedCategories = selectedCategories
      .map((c) => normalizeCategoryToBase(c) || String(c ?? '').trim().toLowerCase())
      .filter(Boolean);

    const isCategoryAllowed = (category: unknown) => {
      if (normalizedSelectedCategories.length === 0) return true;
      const normalized = normalizeCategoryToBase(category) || String(category ?? '').trim().toLowerCase();
      return normalizedSelectedCategories.includes(normalized);
    };

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

    // Use request coalescing to prevent duplicate fetches when multiple map components mount
    const coalesceKey = `map-locations:${user.id}:${cacheKey}`;
    
    try {
      const fetchedLocations = await coalesce(coalesceKey, async () => {
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
              location:locations(name, category, city, address, opening_hours_data)
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

          let sharedLocations = dedupedShares.map(share => {
            const resolvedCity = resolveCityDisplay(share.location?.city, share.location?.address);
            return {
              id: share.location_id || `share-${share.id}`,
              name: share.location?.name || 'Shared Location',
              category: normalizeCategoryToBase(share.location?.category) || (share.location?.category || 'Unknown'),
              address: share.location?.address,
              city: resolvedCity,
              google_place_id: (share.location as any)?.google_place_id || undefined,
              coordinates: {
                lat: Number(share.latitude) || 0,
                lng: Number(share.longitude) || 0
              },
              user_id: share.user_id,
              created_at: share.created_at,
              isFollowing: true,
              sharedByUser: profileMap.get(share.user_id)
            };
          }).filter(loc => {
            if (!isCategoryAllowed(loc.category)) return false;
            return true;
          });

          // Enrich with latestActivity
          const sharedInternalIds = sharedLocations
            .filter(loc => loc.id && !loc.id.startsWith('ChIJ') && !loc.id.startsWith('share-'))
            .map(loc => loc.id);

          if (sharedInternalIds.length > 0) {
            const { data: recentPosts } = await supabase
              .from('posts')
              .select('location_id, caption, rating, created_at')
              .in('location_id', sharedInternalIds)
              .order('created_at', { ascending: false })
              .limit(100);

            const activityMap = new Map<string, { type: 'review' | 'photo'; snippet?: string; created_at: string }>();
            recentPosts?.forEach(post => {
              if (post.location_id && !activityMap.has(post.location_id)) {
                activityMap.set(post.location_id, {
                  type: (post.rating && post.rating > 0) ? 'review' : 'photo',
                  snippet: post.caption?.slice(0, 40) + (post.caption && post.caption.length > 40 ? '...' : ''),
                  created_at: post.created_at
                });
              }
            });

            sharedLocations = sharedLocations.map(loc => {
              const activity = activityMap.get(loc.id);
              return activity ? { ...loc, latestActivity: activity } : loc;
            });
          }

          finalLocations = sharedLocations;
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
            
            // Fetch internal locations within bounds (created by followed users)
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

            // Fetch internal saved locations (user_saved_locations -> locations)
            const { data: savedInternal } = await supabase
              .from('user_saved_locations')
              .select(`
                user_id,
                created_at,
                location:locations (
                  id, name, category, address, city, latitude, longitude, created_by, google_place_id, opening_hours_data, photos
                )
              `)
              .in('user_id', followedUserIds)
              .not('location', 'is', null);

            // Fetch saved places (Google places)
            const { data: savedPlaces } = await supabase
              .from('saved_places')
              .select('place_id, created_at, user_id, place_name, place_category, city, coordinates')
              .in('user_id', followedUserIds);

            const locationMap = new Map<string, MapLocation>();
            const usedCoords = new Set<string>();
            const googlePlaceIdsInLocations = new Set<string>();

            const tryAdd = (loc: MapLocation) => {
              if (!loc?.coordinates) return;
              const lat = Number(loc.coordinates.lat);
              const lng = Number(loc.coordinates.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return;

              // Bounds check (safety)
              if (lat < mapBounds.south || lat > mapBounds.north || lng < mapBounds.west || lng > mapBounds.east) return;

              const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
              if (usedCoords.has(coordKey)) return;

              const key = loc.google_place_id || loc.id;
              if (!key) return;
              if (locationMap.has(key)) return;

              usedCoords.add(coordKey);
              locationMap.set(key, { ...loc, id: key, city: resolveCityDisplay(loc.city, loc.address) });
            };

            // 1) created locations
            (locations || []).forEach((loc: any) => {
              if (loc.google_place_id) googlePlaceIdsInLocations.add(loc.google_place_id);
              tryAdd({
                id: loc.id,
                name: loc.name,
                category: normalizeCategoryToBase(loc.category) || loc.category,
                address: loc.address,
                city: loc.city,
                google_place_id: loc.google_place_id,
                coordinates: { lat: Number(loc.latitude) || 0, lng: Number(loc.longitude) || 0 },
                isFollowing: true,
                user_id: loc.created_by,
                created_at: loc.created_at,
              });
            });

            // 2) internal saved locations
            (savedInternal || []).forEach((row: any) => {
              const loc = row.location;
              if (!loc) return;
              const gp = loc.google_place_id;
              if (gp) {
                if (googlePlaceIdsInLocations.has(gp)) return;
                googlePlaceIdsInLocations.add(gp);
              }
              tryAdd({
                id: loc.id,
                name: loc.name,
                category: normalizeCategoryToBase(loc.category) || loc.category,
                address: loc.address,
                city: loc.city,
                google_place_id: loc.google_place_id,
                opening_hours_data: loc.opening_hours_data,
                photos: loc.photos as string[] | undefined,
                coordinates: { lat: Number(loc.latitude) || 0, lng: Number(loc.longitude) || 0 },
                isFollowing: true,
                user_id: row.user_id,
                created_at: row.created_at,
              });
            });

            // 3) saved_places
            (savedPlaces || []).forEach((sp: any) => {
              if (googlePlaceIdsInLocations.has(sp.place_id)) return;
              const coords = sp.coordinates as any || {};
              tryAdd({
                id: sp.place_id,
                name: sp.place_name || 'Unknown',
                category: normalizeCategoryToBase(sp.place_category) || (sp.place_category || 'Unknown'),
                address: undefined,
                city: sp.city || undefined,
                google_place_id: sp.place_id,
                coordinates: { lat: Number(coords.lat) || 0, lng: Number(coords.lng) || 0 },
                isFollowing: true,
                user_id: sp.user_id,
                created_at: sp.created_at,
              });
            });

            // Fetch profiles for followed users to get avatar/username
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', followedUserIds);

            const profileMap = new Map<string, { id: string; username: string; avatar_url: string | null }>();
            profiles?.forEach(p => profileMap.set(p.id, { id: p.id, username: p.username || 'user', avatar_url: p.avatar_url }));

            // Fetch recent posts/reviews by friends for these locations
            const internalLocationIds = Array.from(locationMap.values())
              .filter(loc => loc.id && !loc.id.startsWith('ChIJ')) // Only internal UUIDs
              .map(loc => loc.id);

            let activityMap = new Map<string, { type: 'review' | 'photo'; snippet?: string; created_at: string; user_id: string }>();
            
            if (internalLocationIds.length > 0) {
              const { data: friendPosts } = await supabase
                .from('posts')
                .select('location_id, user_id, caption, rating, media_urls, created_at')
                .in('user_id', followedUserIds)
                .in('location_id', internalLocationIds)
                .order('created_at', { ascending: false })
                .limit(300);

              friendPosts?.forEach(post => {
                if (post.location_id && !activityMap.has(post.location_id)) {
                  activityMap.set(post.location_id, {
                    type: (post.rating && post.rating > 0) ? 'review' : 'photo',
                    snippet: post.caption?.slice(0, 40) + (post.caption && post.caption.length > 40 ? '...' : ''),
                    created_at: post.created_at,
                    user_id: post.user_id
                  });
                }
              });
            }

            // Enrich locations with savedByUser and latestActivity
            finalLocations = Array.from(locationMap.values())
              .filter((loc) => isCategoryAllowed(loc.category))
              .map(loc => {
                const userProfile = profileMap.get(loc.user_id);
                const activity = activityMap.get(loc.id);
                
                // Determine user action
                let userAction: 'saved' | 'liked' | 'faved' | 'posted' = 'saved';
                if (activity && activity.user_id === loc.user_id) {
                  userAction = activity.type === 'review' ? 'faved' : 'posted';
                }

                return {
                  ...loc,
                  savedByUser: userProfile ? {
                    id: userProfile.id,
                    username: userProfile.username,
                    avatar_url: userProfile.avatar_url,
                    action: userAction
                  } : undefined,
                  latestActivity: activity ? {
                    type: activity.type,
                    snippet: activity.snippet,
                    created_at: activity.created_at
                  } : undefined
                };
              });
          } else {
            // No bounds - fetch by city
            // If no friends are selected, fetch ALL followed users
            let followedUserIds = selectedFollowedUserIds;
            
            if (followedUserIds.length === 0) {
              // Fetch all followed users for this user
              const { data: followedUsers } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);
              
              followedUserIds = followedUsers?.map(f => f.following_id) || [];
            }
            
            if (followedUserIds.length === 0) {
              // User doesn't follow anyone
              finalLocations = [];
              break;
            }

            const normalizeCityKey = (s?: string | null) => {
              // Use the same logic everywhere: municipality/district -> parent city, consistent casing.
              const resolved = resolveCityDisplay(s, undefined);
              const v = String(resolved ?? '').trim().toLowerCase();
              if (!v) return '';
              // drop trailing postal numbers like "dublin 2"
              return v.replace(/\s+\d+$/g, '').trim();
            };

            const normalizedCity = normalizeCityKey(currentCity);

            // Symmetric match: "dublin" matches "dublin 2" and vice versa
            const cityOk = (city?: string | null, address?: string | null) => {
              if (!normalizedCity) return true;
              const resolved = resolveCityDisplay(city, address);
              const c = normalizeCityKey(resolved);
              if (!c) return false;
              return c.includes(normalizedCity) || normalizedCity.includes(c);
            };

            // Fetch internal locations created by followed users (no city filter here; we filter in JS via cityOk)
            const { data: locations } = await supabase
              .from('locations')
              .select('*')
              .in('created_by', followedUserIds)
              .not('latitude', 'is', null)
              .not('longitude', 'is', null)
              .limit(500);

            // Fetch internal saved locations (user_saved_locations -> locations)
            const { data: savedInternal } = await supabase
              .from('user_saved_locations')
              .select(`
                user_id,
                created_at,
              location:locations (
                  id, name, category, address, city, latitude, longitude, created_by, google_place_id, opening_hours_data, photos
                )
              `)
              .in('user_id', followedUserIds)
              .not('location', 'is', null)
              .limit(800);

            // Fetch saved places by followed users (no city filter here; we filter in JS via cityOk)
            const { data: savedPlaces } = await supabase
              .from('saved_places')
              .select('place_id, created_at, user_id, place_name, place_category, city, coordinates')
              .in('user_id', followedUserIds)
              .limit(800);

            const locationMap = new Map<string, MapLocation>();
            const usedCoords = new Set<string>();
            const googlePlaceIdsInLocations = new Set<string>();

            const tryAdd = (loc: MapLocation) => {
              const resolvedCity = resolveCityDisplay(loc.city, loc.address);
              if (!cityOk(resolvedCity, loc.address)) return;
              const lat = Number(loc.coordinates?.lat);
              const lng = Number(loc.coordinates?.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return;

              const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
              if (usedCoords.has(coordKey)) return;

              const key = loc.google_place_id || loc.id;
              if (!key) return;
              if (locationMap.has(key)) return;

              usedCoords.add(coordKey);
              locationMap.set(key, { ...loc, id: key, city: resolvedCity });
            };

            // 1) created locations
            (locations || []).forEach((loc: any) => {
              if (loc.google_place_id) googlePlaceIdsInLocations.add(loc.google_place_id);
              tryAdd({
                id: loc.id,
                name: loc.name,
                category: normalizeCategoryToBase(loc.category) || loc.category,
                address: loc.address,
                city: loc.city,
                google_place_id: loc.google_place_id,
                opening_hours_data: loc.opening_hours_data,
                photos: loc.photos as string[] | undefined,
                coordinates: { lat: Number(loc.latitude) || 0, lng: Number(loc.longitude) || 0 },
                isFollowing: true,
                user_id: loc.created_by,
                created_at: loc.created_at,
              });
            });

            // 2) internal saved locations
            (savedInternal || []).forEach((row: any) => {
              const loc = row.location;
              if (!loc) return;
              const resolvedCity = resolveCityDisplay(loc.city, loc.address);
              if (!cityOk(resolvedCity, loc.address)) return;
              const gp = loc.google_place_id;
              if (gp) {
                if (googlePlaceIdsInLocations.has(gp)) return;
                googlePlaceIdsInLocations.add(gp);
              }
              tryAdd({
                id: loc.id,
                name: loc.name,
                category: normalizeCategoryToBase(loc.category) || loc.category,
                address: loc.address,
                city: loc.city,
                google_place_id: loc.google_place_id,
                opening_hours_data: loc.opening_hours_data,
                photos: loc.photos as string[] | undefined,
                coordinates: { lat: Number(loc.latitude) || 0, lng: Number(loc.longitude) || 0 },
                isFollowing: true,
                user_id: row.user_id,
                created_at: row.created_at,
              });
            });

            // 3) saved_places
            (savedPlaces || []).forEach((sp: any) => {
              if (googlePlaceIdsInLocations.has(sp.place_id)) return;
              const coords = sp.coordinates as any || {};
              tryAdd({
                id: sp.place_id,
                name: sp.place_name || 'Unknown',
                category: normalizeCategoryToBase(sp.place_category) || (sp.place_category || 'Unknown'),
                address: undefined,
                city: sp.city || undefined,
                google_place_id: sp.place_id,
                coordinates: { lat: Number(coords.lat) || 0, lng: Number(coords.lng) || 0 },
                isFollowing: true,
                user_id: sp.user_id,
                created_at: sp.created_at,
              });
            });

            // Fetch profiles for followed users to get avatar/username
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', followedUserIds);

            const profileMap = new Map<string, { id: string; username: string; avatar_url: string | null }>();
            profiles?.forEach(p => profileMap.set(p.id, { id: p.id, username: p.username || 'user', avatar_url: p.avatar_url }));

            // Fetch recent posts/reviews by friends for these locations
            const internalLocationIds = Array.from(locationMap.values())
              .filter(loc => loc.id && !loc.id.startsWith('ChIJ')) // Only internal UUIDs
              .map(loc => loc.id);

            let activityMap = new Map<string, { type: 'review' | 'photo'; snippet?: string; created_at: string; user_id: string }>();
            
            if (internalLocationIds.length > 0) {
              const { data: friendPosts } = await supabase
                .from('posts')
                .select('location_id, user_id, caption, rating, media_urls, created_at')
                .in('user_id', followedUserIds)
                .in('location_id', internalLocationIds)
                .order('created_at', { ascending: false })
                .limit(300);

              friendPosts?.forEach(post => {
                if (post.location_id && !activityMap.has(post.location_id)) {
                  activityMap.set(post.location_id, {
                    type: (post.rating && post.rating > 0) ? 'review' : 'photo',
                    snippet: post.caption?.slice(0, 40) + (post.caption && post.caption.length > 40 ? '...' : ''),
                    created_at: post.created_at,
                    user_id: post.user_id
                  });
                }
              });
            }

            // Enrich locations with savedByUser and latestActivity
            finalLocations = Array.from(locationMap.values())
              .filter((loc) => isCategoryAllowed(loc.category))
              .map(loc => {
                const userProfile = profileMap.get(loc.user_id);
                const activity = activityMap.get(loc.id);
                
                // Determine user action
                let userAction: 'saved' | 'liked' | 'faved' | 'posted' = 'saved';
                if (activity && activity.user_id === loc.user_id) {
                  userAction = activity.type === 'review' ? 'faved' : 'posted';
                }

                return {
                  ...loc,
                  savedByUser: userProfile ? {
                    id: userProfile.id,
                    username: userProfile.username,
                    avatar_url: userProfile.avatar_url,
                    action: userAction
                  } : undefined,
                  latestActivity: activity ? {
                    type: activity.type,
                    snippet: activity.snippet,
                    created_at: activity.created_at
                  } : undefined
                };
              });
          }
          break;
        }

        case 'popular': {
          // POPULAR / "Tutti" filter: show ALL saved locations globally (from locations + saved_places)
          // No restriction on followed users - show everything saved by anyone

          // ---------------------- 1) Fetch saved_places (GLOBAL - all users) ----------------------
          let savedPlacesQuery = supabase
            .from('saved_places')
            .select('place_id, place_name, place_category, city, coordinates, user_id, created_at');

          // NOTE: we don't DB-filter by city anymore because municipalities/districts (e.g., "Vračar")
          // must still match their parent city ("Belgrade"). We'll filter client-side using resolveCityDisplay.

          const { data: savedPlaces } = await savedPlacesQuery.limit(1000);

          // Build a map of google_place_id -> saved_places data (deduplicate by place_id)
          // Also deduplicate by coordinates to avoid pins at same location, preferring best category
          const savedPlacesMap = new Map<string, any>();
          const savedPlaceScores = new Map<string, number>();
          const seenPlaceIds = new Set<string>();
          const coordToPlaceId = new Map<string, string>();

          const normalizeCategory = (cat: any) => {
            const c = String(cat || '').trim().toLowerCase();
            if (!c) return '';
            if (c === 'bars' || c === 'pub') return 'bar';
            if (c === 'restaurants') return 'restaurant';
            if (c === 'coffee' || c === 'coffee_shop' || c === 'cafè') return 'cafe';
            return c;
          };

          const categoryPriority = (cat: any) => {
            const c = normalizeCategory(cat);
            if (c === 'bar') return 3;
            if (c === 'restaurant') return 2;
            if (c === 'cafe') return 1;
            return 0;
          };
          
          (savedPlaces || []).forEach((sp: any) => {
            const coords = sp.coordinates as any;
            const lat = Number(coords?.lat);
            const lng = Number(coords?.lng);
            if (!lat || !lng) return;

            // Create coordinate key (rounded to avoid floating point issues)
            const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

            // Bounds check
            if (mapBounds) {
              if (
                lat < mapBounds.south ||
                lat > mapBounds.north ||
                lng < mapBounds.west ||
                lng > mapBounds.east
              ) {
                return;
              }
            }

            // If we already picked a place for these coords, decide whether to replace it
            const existingPlaceId = coordToPlaceId.get(coordKey);
            if (existingPlaceId) {
              const existingSp = savedPlacesMap.get(existingPlaceId);
              const shouldReplace = categoryPriority(sp.place_category) > categoryPriority(existingSp?.place_category);

              // Always aggregate score into the chosen representative
              if (shouldReplace) {
                // Move existing score over
                const existingScore = savedPlaceScores.get(existingPlaceId) || 0;
                savedPlaceScores.delete(existingPlaceId);
                savedPlacesMap.delete(existingPlaceId);

                coordToPlaceId.set(coordKey, sp.place_id);
                savedPlacesMap.set(sp.place_id, sp);
                savedPlaceScores.set(sp.place_id, existingScore + 1);
              } else {
                savedPlaceScores.set(existingPlaceId, (savedPlaceScores.get(existingPlaceId) || 0) + 1);
              }
              return;
            }

            // Skip duplicates of same place_id (but still count them)
            if (seenPlaceIds.has(sp.place_id)) {
              savedPlaceScores.set(sp.place_id, (savedPlaceScores.get(sp.place_id) || 0) + 1);
              return;
            }

            seenPlaceIds.add(sp.place_id);
            coordToPlaceId.set(coordKey, sp.place_id);

            // Score = count of saves
            savedPlaceScores.set(sp.place_id, (savedPlaceScores.get(sp.place_id) || 0) + 1);

            // Store first occurrence
            savedPlacesMap.set(sp.place_id, sp);
          });

          // ---------------------- 2) Fetch from locations table ----------------------
          let locationsQuery = supabase
            .from('locations')
            .select('id, name, category, address, city, latitude, longitude, created_by, created_at, google_place_id, opening_hours_data, photos')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

          if (mapBounds) {
            locationsQuery = locationsQuery
              .gte('latitude', mapBounds.south)
              .lte('latitude', mapBounds.north)
              .gte('longitude', mapBounds.west)
              .lte('longitude', mapBounds.east);
          }
          // NOTE: we don't DB-filter by city anymore; we filter client-side using resolveCityDisplay
          // so that districts/municipalities still show under their parent city.

          const { data: locations, error: locError } = await locationsQuery.limit(500);

          if (locError) {
            console.error('Error fetching popular locations:', locError);
            break;
          }

          const locationIds = (locations || []).map(l => l.id);
          const googlePlaceIdsFromLocations = new Set(
            (locations || []).map(l => l.google_place_id).filter(Boolean)
          );
          // Track coordinates already used by locations table
          const coordsFromLocations = new Set<string>();
          (locations || []).forEach((loc: any) => {
            if (loc.latitude && loc.longitude) {
              coordsFromLocations.add(`${Number(loc.latitude).toFixed(6)},${Number(loc.longitude).toFixed(6)}`);
            }
          });

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

          // Calculate scores for internal locations (count all saves, not just followed)
          const locationScores = new Map<string, number>();
          
          locationSaves.forEach((save: any) => {
            const score = locationScores.get(save.location_id) || 0;
            locationScores.set(save.location_id, score + 1);
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
          const currentCityKey = (currentCity || '').trim();
          const resolvedCurrentCity = currentCityKey ? resolveCityDisplay(currentCityKey) : '';
          const currentCityLower = resolvedCurrentCity.toLowerCase();

          // From locations table - show ALL locations (not just those with saves)
          const fromLocations: MapLocation[] = (locations || [])
            .map((loc: any) => {
              const resolvedCity = resolveCityDisplay(loc.city, loc.address);
              return {
                id: loc.id,
                name: loc.name,
                category: loc.category,
                address: loc.address,
                city: resolvedCity,
                google_place_id: loc.google_place_id,
                opening_hours_data: loc.opening_hours_data,
                photos: loc.photos as string[] | undefined,
                coordinates: {
                  lat: Number(loc.latitude) || 0,
                  lng: Number(loc.longitude) || 0,
                },
                user_id: loc.created_by,
                created_at: loc.created_at,
                recommendationScore: locationScores.get(loc.id) || 1,
              } as MapLocation;
            })
            .filter((l) => {
              if (!currentCityLower) return true;
              return (l.city || '').toLowerCase() === currentCityLower;
            });

          // From saved_places that are NOT already in locations table AND not at same coordinates
          const fromSavedPlaces: MapLocation[] = [];
          savedPlacesMap.forEach((sp, googlePlaceId) => {
            // Skip if already represented in locations
            if (googlePlaceIdsFromLocations.has(googlePlaceId)) return;

            const coords = sp.coordinates as any;
            const lat = Number(coords?.lat);
            const lng = Number(coords?.lng);
            if (!lat || !lng) return;

            // Skip if coordinates already used by a location
            const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            if (coordsFromLocations.has(coordKey)) return;

            const resolvedCity = resolveCityDisplay(sp.city);
            if (currentCityLower && resolvedCity.toLowerCase() !== currentCityLower) return;

            fromSavedPlaces.push({
              id: googlePlaceId,
              name: sp.place_name || 'Unknown',
              category: sp.place_category || 'restaurant',
              address: undefined,
              city: resolvedCity,
              google_place_id: googlePlaceId,
              coordinates: { lat, lng },
              user_id: sp.user_id,
              created_at: sp.created_at,
              recommendationScore: savedPlaceScores.get(googlePlaceId) || 1,
            });
          });

          // Combine and sort
          let combinedLocations = [...fromLocations, ...fromSavedPlaces]
            .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
            .slice(0, 300)
            .filter(location => {
              if (!isCategoryAllowed(location.category)) return false;
              return true;
            });

          // Enrich with latestActivity (any user's most recent post)
          const popularInternalIds = combinedLocations
            .filter(loc => loc.id && !loc.id.startsWith('ChIJ'))
            .map(loc => loc.id);

          if (popularInternalIds.length > 0) {
            const { data: recentPosts } = await supabase
              .from('posts')
              .select('location_id, caption, rating, created_at')
              .in('location_id', popularInternalIds)
              .order('created_at', { ascending: false })
              .limit(300);

            const activityMap = new Map<string, { type: 'review' | 'photo'; snippet?: string; created_at: string }>();
            recentPosts?.forEach(post => {
              if (post.location_id && !activityMap.has(post.location_id)) {
                activityMap.set(post.location_id, {
                  type: (post.rating && post.rating > 0) ? 'review' : 'photo',
                  snippet: post.caption?.slice(0, 40) + (post.caption && post.caption.length > 40 ? '...' : ''),
                  created_at: post.created_at
                });
              }
            });

            combinedLocations = combinedLocations.map(loc => {
              const activity = activityMap.get(loc.id);
              return activity ? { ...loc, latestActivity: activity } : loc;
            });
          }

          finalLocations = combinedLocations;
          
          console.log(`✅ Found ${finalLocations.length} popular locations (ALL global saves)`);
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
                id, name, category, address, city, latitude, longitude, created_by, google_place_id, opening_hours_data, photos
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
              const resolved = resolveCityDisplay(loc.city, loc.address);
              const want = resolveCityDisplay(currentCity);
              if (resolved.toLowerCase() !== want.toLowerCase()) {
                return;
              }
            }

            const key = loc.id || sl.location_id;
            if (key && !locationMap.has(key)) {
              locationMap.set(key, {
                id: key,
                name: loc.name,
                category: normalizeCategoryToBase(loc.category) || (loc.category || 'Unknown'),
                address: loc.address,
                city: resolveCityDisplay(loc.city, loc.address),
                google_place_id: loc.google_place_id,
                photos: loc.photos as string[] | undefined,
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
              const resolved = resolveCityDisplay(sp.city);
              const want = resolveCityDisplay(currentCity);
              if (resolved.toLowerCase() !== want.toLowerCase()) {
                return;
              }
            }

            const key = sp.place_id;
            if (key && !locationMap.has(key)) {
              locationMap.set(key, {
                id: sp.place_id,
                name: sp.place_name || 'Unknown',
                category: normalizeCategoryToBase(sp.place_category) || (sp.place_category || 'Unknown'),
                address: undefined,
                city: resolveCityDisplay(sp.city) || 'Unknown',
                google_place_id: sp.place_id,
                coordinates: { lat, lng },
                isSaved: true,
                user_id: sp.user_id,
                created_at: sp.created_at
              });
            }
          });

          let savedFinalLocations = Array.from(locationMap.values())
            .filter(location => {
              if (!isCategoryAllowed(location.category)) return false;
              return true;
            });

          // Enrich with latestActivity (any user's most recent post)
          const savedInternalIds = savedFinalLocations
            .filter(loc => loc.id && !loc.id.startsWith('ChIJ'))
            .map(loc => loc.id);

          if (savedInternalIds.length > 0) {
            const { data: recentPosts } = await supabase
              .from('posts')
              .select('location_id, caption, rating, created_at')
              .in('location_id', savedInternalIds)
              .order('created_at', { ascending: false })
              .limit(300);

            const activityMap = new Map<string, { type: 'review' | 'photo'; snippet?: string; created_at: string }>();
            recentPosts?.forEach(post => {
              if (post.location_id && !activityMap.has(post.location_id)) {
                activityMap.set(post.location_id, {
                  type: (post.rating && post.rating > 0) ? 'review' : 'photo',
                  snippet: post.caption?.slice(0, 40) + (post.caption && post.caption.length > 40 ? '...' : ''),
                  created_at: post.created_at
                });
              }
            });

            savedFinalLocations = savedFinalLocations.map(loc => {
              const activity = activityMap.get(loc.id);
              return activity ? { ...loc, latestActivity: activity } : loc;
            });
          }

          finalLocations = savedFinalLocations;
          
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
        return finalLocations;
      }, 150); // 150ms deduplication window
      
      // Cache the results
      locationCache.set(cacheKey, {
        data: fetchedLocations,
        timestamp: Date.now()
      });
      
      setLocations(fetchedLocations);

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
