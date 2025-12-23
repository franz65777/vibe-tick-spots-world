import { memo, useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCategoryImage } from '@/utils/categoryIcons';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import { type SaveTag } from '@/utils/saveTags';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import locationPinIcon from '@/assets/location-pin-icon.png';

interface SuggestedLocation {
  id: string;
  name: string;
  category: string;
  city: string | null;
  address?: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  save_count: number;
  saved_by: Array<{ avatar_url: string | null; username: string }>;
  google_place_id?: string | null;
  source: 'db' | 'discover';
}

// Simple truncated text component - no animation for better scroll performance
const TruncatedText = memo(({ text, className }: { text: string; className?: string }) => (
  <div className={`truncate ${className}`}>{text}</div>
));

TruncatedText.displayName = 'TruncatedText';

// Calculate distance between two coordinates in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

const FeedSuggestionsCarousel = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location - only fetch once
  useEffect(() => {
    // Skip if already fetched
    if (userLocation) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Silently fail - distance won't be shown
        },
        { maximumAge: 60000, timeout: 10000 } // Use cached location for 1 minute
      );
    }
  }, [userLocation]);

  // Round location to 3 decimal places (~100m precision) to keep query key stable
  const stableLocation = userLocation ? {
    lat: Math.round(userLocation.lat * 1000) / 1000,
    lng: Math.round(userLocation.lng * 1000) / 1000
  } : null;

  // Use React Query for caching - data persists when returning from location card
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['feed-suggestions', user?.id, stableLocation?.lat, stableLocation?.lng],
    queryFn: async () => {
      if (!user?.id || !userLocation) return [];

      const normalizeCategoryForDiscover = (cat: string): string => {
        const c = (cat || '').toLowerCase().trim();
        if (!c) return '';
        if (c.includes('ristor')) return 'restaurant';
        if (c.includes('restaurant')) return 'restaurant';
        if (c.includes('bar')) return 'bar';
        if (c.includes('cafe') || c.includes('caff') || c.includes('coffee')) return 'cafe';
        if (c.includes('bakery') || c.includes('panett') || c.includes('pasticc')) return 'bakery';
        if (c.includes('hotel')) return 'hotel';
        if (c.includes('museum') || c.includes('museo')) return 'museum';
        if (c.includes('cinema')) return 'cinema';
        return c;
      };

      // 1) Build an "exclude set" of everything the user already saved
      const [userSavedInternalRes, userSavedPlacesRes] = await Promise.all([
        supabase
          .from('user_saved_locations')
          .select('location_id, locations(google_place_id, category)')
          .eq('user_id', user.id),
        supabase
          .from('saved_places')
          .select('place_id, place_category')
          .eq('user_id', user.id),
      ]);

      const userSavedInternal = userSavedInternalRes.data || [];
      const userSavedPlaces = userSavedPlacesRes.data || [];

      const exclude = new Set<string>();
      userSavedInternal.forEach((s: any) => {
        if (s.location_id) exclude.add(s.location_id);
        if (s.locations?.google_place_id) exclude.add(s.locations.google_place_id);
      });
      userSavedPlaces.forEach((p: any) => {
        if (p.place_id) exclude.add(p.place_id);
      });

      // 2) Determine preferred categories (from both internal + google saved)
      const categoryCounts = new Map<string, number>();
      userSavedInternal.forEach((save: any) => {
        const cat = save.locations?.category;
        if (cat) categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      });
      userSavedPlaces.forEach((sp: any) => {
        const cat = sp.place_category;
        if (cat) categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      });

      const preferredCategoriesRaw = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      const preferredDiscover = Array.from(
        new Set(preferredCategoriesRaw.map(normalizeCategoryForDiscover).filter(Boolean))
      );

      const isPreferred = (cat: string) => {
        const n = normalizeCategoryForDiscover(cat);
        return preferredDiscover.includes(n);
      };

      // 3) Pull internal DB locations near the user with business profile images
      const { data: dbLocations, error: dbErr } = await supabase
        .from('locations')
        .select(`
          id, name, category, city, address, image_url, latitude, longitude, google_place_id,
          business_profiles!business_profiles_location_id_fkey (
            id,
            user_id,
            profiles:user_id (avatar_url)
          )
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(500);

      if (dbErr) throw dbErr;

      const internalRaw = (dbLocations || [])
        .filter((loc: any) => {
          if (exclude.has(loc.id)) return false;
          if (loc.google_place_id && exclude.has(loc.google_place_id)) return false;
          const d = calculateDistance(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude);
          return d <= 50;
        })
        .map((loc: any) => ({
          ...loc,
          _distanceKm: calculateDistance(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude),
        }))
        .sort((a: any, b: any) => a._distanceKm - b._distanceKm);

      const internalGoogleIds = new Set<string>();
      internalRaw.forEach((l: any) => {
        if (l.google_place_id) internalGoogleIds.add(l.google_place_id);
      });

      // Fetch save_count for the nearest internal candidates (used as tie-breaker)
      const internalSample = internalRaw.slice(0, 200);
      const internalSampleIds = internalSample.map((l: any) => l.id);

      const internalCounts = new Map<string, number>();
      if (internalSampleIds.length > 0) {
        const { data: uslRows } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .in('location_id', internalSampleIds);

        (uslRows || []).forEach((r: any) => {
          internalCounts.set(r.location_id, (internalCounts.get(r.location_id) || 0) + 1);
        });
      }

      const internalCandidates: SuggestedLocation[] = internalSample.map((loc: any) => {
        // Get business profile image if available
        const businessProfile = loc.business_profiles?.[0];
        const businessImage = businessProfile?.profiles?.avatar_url || null;
        
        return {
          id: loc.id,
          name: loc.name,
          category: loc.category,
          city: loc.city,
          address: loc.address,
          image_url: businessImage || loc.image_url, // Prefer business image
          latitude: loc.latitude,
          longitude: loc.longitude,
          google_place_id: loc.google_place_id,
          save_count: internalCounts.get(loc.id) || 0,
          saved_by: [],
          source: 'db',
        };
      });

      // 4) Discover NEW (never-saved-on-app) places around the user via edge function
      // Dynamic radius: start small (500m), expand if not enough results
      const fallbackDiscover = ['restaurant', 'bar', 'cafe', 'bakery', 'hotel', 'museum', 'cinema'];
      const categoryQueries = Array.from(new Set([...preferredDiscover, ...fallbackDiscover])).filter(Boolean).slice(0, 6);

      // Try with small radius first (500m for big cities)
      let radiusKm = 0.5;
      let allRawPlaces: any[] = [];
      
      // Fetch with initial small radius
      const fetchPlaces = async (radius: number) => {
        const results = await Promise.all(
          categoryQueries.map((cat) =>
            supabase.functions.invoke('foursquare-search', {
              body: {
                lat: userLocation.lat,
                lng: userLocation.lng,
                radiusKm: radius,
                limit: 15,
                query: cat,
              },
            })
          )
        );
        const places: any[] = [];
        results.forEach((res) => {
          if (!res.error && res.data?.places) places.push(...res.data.places);
        });
        return places;
      };

      // Start with 500m, expand if needed
      allRawPlaces = await fetchPlaces(0.5);
      
      // If not enough results, expand radius progressively
      if (allRawPlaces.length < 15) {
        const expandedPlaces = await fetchPlaces(2); // 2km
        allRawPlaces = [...allRawPlaces, ...expandedPlaces];
      }
      if (allRawPlaces.length < 10) {
        const expandedPlaces = await fetchPlaces(5); // 5km for small cities
        allRawPlaces = [...allRawPlaces, ...expandedPlaces];
      }


      // Deduplicate by fsq_id only (NOT by name - chains can have same name)
      const seenFsq = new Set<string>();
      const rawPlaces = allRawPlaces.filter((p: any) => {
        const id = String(p.fsq_id || '');
        if (!id || seenFsq.has(id)) return false;
        seenFsq.add(id);
        return true;
      });

      const discoverCandidates: SuggestedLocation[] = rawPlaces
        .map((p: any) => {
          const placeId = String(p.fsq_id);
          return {
            id: placeId,
            google_place_id: placeId,
            name: p.name,
            category: p.category || 'place',
            city: p.city || null,
            address: p.address || null,
            image_url: null, // Discover places use category icons
            latitude: Number(p.lat),
            longitude: Number(p.lng),
            save_count: 0,
            saved_by: [],
            source: 'discover',
          } as SuggestedLocation;
        })
        .filter((p) => {
          if (!p.id || !p.latitude || !p.longitude) return false;
          if (exclude.has(p.id)) return false; // already saved by user
          if (internalGoogleIds.has(p.id)) return false; // already exists in DB
          return true;
        });

      // 5) Merge candidates - deduplicate by ID only (NOT by name - chains have same name)
      const allCandidates = [...internalCandidates, ...discoverCandidates];
      const seenIds = new Set<string>();
      const uniqueCandidates = allCandidates.filter((c) => {
        const normId = (c.google_place_id || c.id).toLowerCase();
        if (seenIds.has(normId)) return false;
        seenIds.add(normId);
        return true;
      });

      // 6) Dynamic max distance based on results - allow up to 5km if expanded
      const MAX_DISTANCE_KM = 5;

      const ranked = uniqueCandidates
        .map((c) => ({
          c,
          d: calculateDistance(userLocation.lat, userLocation.lng, c.latitude, c.longitude),
          pref: isPreferred(c.category) ? 1 : 0,
        }))
        .filter((x) => x.d <= MAX_DISTANCE_KM) // strict proximity filter
        .sort((a, b) => {
          // 1) Proximity is most important - strict distance sorting
          const distDiff = a.d - b.d;
          if (Math.abs(distDiff) > 0.05) return distDiff; // 50m threshold
          
          // 2) For very close places, prefer ones with more saves
          const saveDiff = (b.c.save_count || 0) - (a.c.save_count || 0);
          if (saveDiff !== 0) return saveDiff;
          
          // 3) Finally, prefer user's category preferences
          return b.pref - a.pref;
        })
        .slice(0, 10)
        .map((x) => x.c);

      // 6) Hydrate saved_by ONLY for DB locations
      const dbIds = ranked.filter((c) => c.source === 'db').map((c) => c.id);
      if (dbIds.length > 0) {
        const { data: uslRows } = await supabase
          .from('user_saved_locations')
          .select('location_id, user_id')
          .in('location_id', dbIds);

        const rows = uslRows || [];
        const firstUsersByLoc = new Map<string, string[]>();

        rows.forEach((r: any) => {
          const arr = firstUsersByLoc.get(r.location_id) || [];
          if (arr.length < 3 && !arr.includes(r.user_id)) arr.push(r.user_id);
          firstUsersByLoc.set(r.location_id, arr);
        });

        const profileIds = Array.from(new Set(Array.from(firstUsersByLoc.values()).flat()));
        let profilesMap = new Map<string, { avatar_url: string | null; username: string }>();
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, avatar_url, username')
            .in('id', profileIds);
          (profiles || []).forEach((p: any) => profilesMap.set(p.id, { avatar_url: p.avatar_url, username: p.username }));
        }

        ranked.forEach((c) => {
          if (c.source !== 'db') return;
          const uids = firstUsersByLoc.get(c.id) || [];
          c.saved_by = uids.map((uid) => profilesMap.get(uid)).filter(Boolean) as any;
        });
      }

      return ranked;
    },
    enabled: !!user?.id && !!userLocation,
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Save location handler - must be before any return
  const handleSaveLocation = useCallback(async (loc: SuggestedLocation, tag: SaveTag) => {
    if (!user?.id) {
      toast.error(t('loginRequired', { ns: 'common' }));
      return;
    }

    try {
      let locationId = loc.id;

      // If this is a discovered (never-saved) place, create it in `locations` first
      if (loc.source === 'discover') {
        const { data: existing } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', loc.google_place_id || loc.id)
          .maybeSingle();

        if (existing?.id) {
          locationId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from('locations')
            .insert({
              name: loc.name,
              category: loc.category,
              city: loc.city,
              address: loc.address || null,
              image_url: null,
              latitude: loc.latitude,
              longitude: loc.longitude,
              google_place_id: loc.google_place_id || loc.id,
            })
            .select('id')
            .maybeSingle();

          if (createErr) throw createErr;
          if (!created?.id) throw new Error('Could not create location');
          locationId = created.id;
        }
      }

      const { error } = await supabase
        .from('user_saved_locations')
        .upsert({
          user_id: user.id,
          location_id: locationId,
          save_tag: tag,
        }, { onConflict: 'user_id,location_id' });

      if (error) throw error;

      toast.success(t('locationSaved', { ns: 'common' }));

      // Remove from cached suggestions + refetch to ensure excludes are recalculated
      const stableLat = userLocation ? Math.round(userLocation.lat * 1000) / 1000 : null;
      const stableLng = userLocation ? Math.round(userLocation.lng * 1000) / 1000 : null;
      queryClient.setQueryData<SuggestedLocation[]>(
        ['feed-suggestions', user.id, stableLat, stableLng],
        (prev) => prev?.filter((s) => s.id !== loc.id) || []
      );
      queryClient.invalidateQueries({ queryKey: ['feed-suggestions', user.id, stableLat, stableLng] });
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error(t('errorSavingLocation', { ns: 'common' }));
    }
  }, [user?.id, userLocation?.lat, userLocation?.lng, t, queryClient]);

  // Check if category should have bigger icon
  const shouldHaveBiggerIcon = (category: string): boolean => {
    const lowerCategory = category.toLowerCase();
    return lowerCategory.includes('restaurant') || 
           lowerCategory.includes('ristorante') ||
           lowerCategory.includes('hotel') ||
           lowerCategory.includes('food') ||
           lowerCategory.includes('dining');
  };

  // Store scroll index when clicking a card
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const clickedIndexRef = useRef<number>(0);

  // Restore scroll position when returning from location detail
  useEffect(() => {
    const savedIndex = sessionStorage.getItem('suggestions_clicked_index');
    if (savedIndex !== null && scrollContainerRef.current && suggestions.length > 0) {
      const idx = parseInt(savedIndex, 10);
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const cardWidth = 192 + 12; // w-48 (192px) + gap-3 (12px)
            scrollContainerRef.current.scrollLeft = idx * cardWidth;
          }
          sessionStorage.removeItem('suggestions_clicked_index');
        });
      });
    }
  }, [suggestions]);

  // Handle location click - same behavior as post location clicks
  const handleLocationClick = useCallback((loc: SuggestedLocation, idx: number) => {
    // Save clicked index for scroll restoration
    sessionStorage.setItem('suggestions_clicked_index', String(idx));

    // Save an anchor (top visible feed post + its visual offset) so we restore the *exact* same point
    const container = document.querySelector('[data-feed-scroll-container]') as HTMLDivElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const postEls = Array.from(container.querySelectorAll<HTMLElement>('[data-feed-post-id]'));

      const firstVisible = postEls.find((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > containerRect.top + 1; // at least partially visible
      });

      const postId = firstVisible?.getAttribute('data-feed-post-id') || undefined;
      const offset = firstVisible
        ? firstVisible.getBoundingClientRect().top - containerRect.top
        : undefined;

      sessionStorage.setItem(
        'feed_scroll_anchor',
        JSON.stringify({
          postId,
          offset,
          scrollTop: container.scrollTop,
        })
      );
    }

    navigate('/', {
      state: {
        centerMap: {
          lat: loc.latitude,
          lng: loc.longitude,
          locationId: loc.id,
          shouldFocus: true,
        },
        openPinDetail: {
          id: loc.id,
          name: loc.name,
          lat: loc.latitude,
          lng: loc.longitude,
          category: loc.category,
          google_place_id: loc.google_place_id || null,
          sourceSection: 'recommendations',
        },
        returnTo: '/feed',
      },
    });
  }, [navigate]);

  // Early return AFTER all hooks
  if (isLoading || suggestions.length === 0) return null;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="px-4 mb-3 flex items-center gap-2">
        <img src={locationPinIcon} alt="" className="w-5 h-5 object-contain" />
        <h3 className="font-bold text-foreground">{t('recommendedForYou', { ns: 'feed' })}</h3>
      </div>

      {/* Horizontal scroll - GPU accelerated for smooth scrolling */}
      <div 
        ref={scrollContainerRef} 
        className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
        style={{ willChange: 'scroll-position', WebkitOverflowScrolling: 'touch' }}
      >
        {suggestions.map((loc, idx) => {
          const categoryImage = getCategoryImage(loc.category);
          const isBiggerIcon = shouldHaveBiggerIcon(loc.category);

          // Calculate distance if user location is available
          const distance = userLocation 
            ? calculateDistance(userLocation.lat, userLocation.lng, loc.latitude, loc.longitude)
            : null;

          return (
            <div
              key={loc.id}
              data-location-id={loc.id}
              onClick={() => handleLocationClick(loc, idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLocationClick(loc, idx)}
              className="shrink-0 w-52 bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 rounded-xl overflow-hidden shadow-lg shadow-black/5 dark:shadow-black/20 text-left cursor-pointer transform-gpu"
            >
              <div className="flex gap-2 p-2">
                {/* Image/Icon */}
                <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0">
                  {loc.image_url ? (
                    <img 
                      src={loc.image_url} 
                      alt={loc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                      <img 
                        src={categoryImage} 
                        alt={loc.category}
                        className={`object-contain ${isBiggerIcon ? 'w-6 h-6' : 'w-5 h-5'}`}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <TruncatedText 
                    text={loc.name} 
                    className="font-semibold text-xs text-foreground leading-tight"
                  />
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {distance !== null ? formatDistance(distance) : (loc.city || loc.category)}
                    </span>
                    {loc.source === 'discover' ? (
                      <span className="text-[9px] font-medium text-primary">
                        {t('beFirstToSave', { ns: 'feed', defaultValue: 'Be first!' })}
                      </span>
                    ) : loc.saved_by.length > 0 ? (
                      <div className="flex items-center gap-0.5">
                        <div className="flex -space-x-1">
                          {loc.saved_by.slice(0, 2).map((saver, idx) => (
                            <Avatar key={idx} className="h-3.5 w-3.5 border border-background">
                              <AvatarImage src={saver.avatar_url || undefined} />
                              <AvatarFallback className="text-[5px] bg-primary/10">
                                {saver.username?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Save button */}
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <SaveLocationDropdown
                    isSaved={false}
                    onSave={(tag) => handleSaveLocation(loc, tag)}
                    onUnsave={() => {}}
                    variant="ghost"
                    size="icon"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

FeedSuggestionsCarousel.displayName = 'FeedSuggestionsCarousel';

export default FeedSuggestionsCarousel;
