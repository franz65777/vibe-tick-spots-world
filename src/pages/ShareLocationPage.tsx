import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Loader2, Users, UserCheck, User } from 'lucide-react';
import { getCategoryImage } from '@/utils/categoryIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { nominatimGeocoding } from '@/lib/nominatimGeocoding';
import { mapGooglePlaceTypeToCategory, isAllowedCategory, isAllowedNominatimType } from '@/utils/allowedCategories';
import { formatSearchResultAddress } from '@/utils/addressFormatter';

interface NearbyLocation {
  id: string;
  name: string;
  address: string;
  city?: string;
  streetName?: string;
  streetNumber?: string;
  distance: number;
  coordinates: { lat: number; lng: number };
  category?: string;
}

interface FollowerUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

const ShareLocationPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('sharePosition');
  const { t: tCommon } = useTranslation('common');
  const { user } = useAuth();
  const { location, loading: geoLoading } = useGeolocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [shareType, setShareType] = useState<'all_followers' | 'close_friends' | 'specific_users'>('all_followers');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);
  const [closeFriendsProfiles, setCloseFriendsProfiles] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserSearchFocused, setIsUserSearchFocused] = useState(false);
  const [isEditingShareType, setIsEditingShareType] = useState(true);
  const [showCloseFriendsAvatars, setShowCloseFriendsAvatars] = useState(false);
  const [showSpecificUsersSearch, setShowSpecificUsersSearch] = useState(false);

  // Fetch nearby locations
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      fetchNearbyLocations();
    }
  }, [location]);

  // Fetch followers and close friends
  useEffect(() => {
    if (user) {
      fetchFollowers();
      fetchCloseFriends();
    }
  }, [user]);

  const fetchNearbyLocations = async () => {
    if (!location) return;
    
    try {
      // Fetch many more locations to properly filter by distance
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(100);

      if (error) throw error;

      // Calculate distance for all locations
      const withDistance = data?.map(loc => {
        const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
        const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
        const distance = calculateDistance(
          location.latitude!,
          location.longitude!,
          lat,
          lng
        );
        return {
          id: loc.id,
          name: loc.name,
          address: loc.address || '',
          city: loc.city || '',
          distance,
          coordinates: { lat, lng },
          category: loc.category
        };
      }) || [];

      // Sort by distance and take only closest 5 within 500km
      const nearby = withDistance
        .filter(loc => loc.distance <= 500) // Only show locations within 500km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      setNearbyLocations(nearby);
    } catch (error) {
      console.error('Error fetching nearby locations:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchFollowers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      if (error) throw error;

      const followerIds = data?.map(f => f.follower_id) || [];
      
      if (followerIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', followerIds);

        if (profileError) throw profileError;
        setFollowers(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchCloseFriends = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('close_friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (error) throw error;
      const friendIds = data?.map(cf => cf.friend_id) || [];
      setCloseFriends(friendIds);

      // Fetch profiles for close friends
      if (friendIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', friendIds);

        if (profileError) throw profileError;
        setCloseFriendsProfiles(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching close friends:', error);
    }
  };

  // Normalize string for fuzzy matching - handles typos like "diceys" vs "dicey's" or "dizeys"
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars including apostrophes
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Simple phonetic normalization for common letter substitutions
  const phoneticNormalize = (str: string): string => {
    return normalizeString(str)
      .replace(/z/g, 's')      // dizey -> disey
      .replace(/ph/g, 'f')     // phone -> fone  
      .replace(/ck/g, 'k')     // duck -> duk
      .replace(/ee/g, 'i')     // street -> strit
      .replace(/ie/g, 'i')     // dicey -> dici
      .replace(/ey/g, 'i')     // dicey -> dici
      .replace(/y$/g, 'i');    // dicey -> dicei
  };

  // Calculate string similarity (Levenshtein-based) with phonetic matching
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);
    
    // Exact match after normalization
    if (s1 === s2) return 1.0;
    
    // Phonetic match (handles dizey's vs dicey's)
    const p1 = phoneticNormalize(str1);
    const p2 = phoneticNormalize(str2);
    if (p1 === p2) return 0.98;
    
    // Substring match (partial)
    if (s2.includes(s1) || s1.includes(s2)) {
      const longer = Math.max(s1.length, s2.length);
      const shorter = Math.min(s1.length, s2.length);
      return shorter / longer * 0.95;
    }
    
    // Levenshtein distance on normalized strings
    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    const levenshteinScore = maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength);
    
    // Also check phonetic Levenshtein for better typo handling
    const pMatrix: number[][] = [];
    for (let i = 0; i <= p2.length; i++) {
      pMatrix[i] = [i];
    }
    for (let j = 0; j <= p1.length; j++) {
      pMatrix[0][j] = j;
    }
    
    for (let i = 1; i <= p2.length; i++) {
      for (let j = 1; j <= p1.length; j++) {
        if (p2.charAt(i - 1) === p1.charAt(j - 1)) {
          pMatrix[i][j] = pMatrix[i - 1][j - 1];
        } else {
          pMatrix[i][j] = Math.min(
            pMatrix[i - 1][j - 1] + 1,
            pMatrix[i][j - 1] + 1,
            pMatrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const pDistance = pMatrix[p2.length][p1.length];
    const pMaxLength = Math.max(p1.length, p2.length);
    const phoneticScore = pMaxLength === 0 ? 1.0 : 1.0 - (pDistance / pMaxLength);
    
    // Return the best score between standard and phonetic
    return Math.max(levenshteinScore, phoneticScore * 0.95);
  };

  // Calculate relevance score combining name similarity and geographic distance
  // Distance is weighted more heavily to prefer nearby locations with typos over exact matches far away
  const calculateRelevanceScore = (
    query: string, 
    name: string, 
    address: string, 
    distance: number
  ): number => {
    const nameSimilarity = calculateSimilarity(query, name);
    const addressSimilarity = calculateSimilarity(query, address);
    
    // Prioritize name matches heavily
    let bestSimilarity = nameSimilarity;
    
    // Bonus for exact or very close matches
    const normalizedQuery = normalizeString(query);
    const normalizedName = normalizeString(name);
    if (normalizedName === normalizedQuery) {
      bestSimilarity = 1.0; // Perfect match
    } else if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
      bestSimilarity = Math.max(bestSimilarity, 0.95); // Substring match bonus
    }
    
    // Address can help but is secondary
    bestSimilarity = Math.max(bestSimilarity, addressSimilarity * 0.5);
    
    // Distance factor - strongly favor nearby locations
    // Within 5km: full bonus, 5-50km: gradual decrease, >50km: minimal bonus
    let distanceFactor = 0.2; // Default for unknown distance
    if (distance !== Infinity) {
      if (distance <= 5) {
        distanceFactor = 1.0; // Very close - full bonus
      } else if (distance <= 50) {
        distanceFactor = 1.0 - ((distance - 5) / 45) * 0.6; // 1.0 to 0.4
      } else if (distance <= 200) {
        distanceFactor = 0.4 - ((distance - 50) / 150) * 0.3; // 0.4 to 0.1
      } else {
        distanceFactor = 0.1; // Far away - minimal bonus
      }
    }
    
    // For high similarity (>0.8), name is primary. For lower similarity, distance matters more
    // This ensures "dizeys" 2km away beats "diceys" 500km away
    if (bestSimilarity >= 0.8) {
      // Good match - weight: 70% similarity, 30% distance
      return bestSimilarity * 0.7 + distanceFactor * 0.3;
    } else {
      // Fuzzy match - weight: 50% similarity, 50% distance (prefer nearby)
      return bestSimilarity * 0.5 + distanceFactor * 0.5;
    }
  };

  // Enrich location with street address via reverse geocoding if missing
  const enrichAddressIfMissing = async (result: any): Promise<any> => {
    // Only enrich if we have coords but no street name
    if (result.streetName || !result.lat || !result.lng) {
      return result;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { lat: result.lat, lng: result.lng, language: 'en' }
      });
      
      if (!error && data?.formatted_address) {
        // Parse the formatted address to extract street info
        const parts = data.formatted_address.split(',').map((p: string) => p.trim());
        if (parts.length > 0) {
          // First part is usually street + number
          const streetPart = parts[0];
          const numberMatch = streetPart.match(/^(.+?)\s+(\d+[-–]?\d*)$/) || 
                             streetPart.match(/^(\d+[-–]?\d*)\s+(.+)$/);
          
          if (numberMatch) {
            if (/^\d/.test(numberMatch[1])) {
              result.streetNumber = numberMatch[1];
              result.streetName = numberMatch[2];
            } else {
              result.streetName = numberMatch[1];
              result.streetNumber = numberMatch[2];
            }
          } else {
            result.streetName = streetPart;
          }
        }
        if (data.city && !result.city) {
          result.city = data.city;
        }
      }
    } catch (e) {
      // Silently fail - address enrichment is best-effort
      console.log('Address enrichment failed:', e);
    }
    
    return result;
  };

  const searchLocations = async (query: string) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const userLat = location?.latitude;
      const userLng = location?.longitude;
      
      // Normalize query for fuzzy search - search both original and without special chars
      const normalizedQuery = query.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      
      // Search existing locations - fetch more results for client-side fuzzy filtering
      // Use OR to match both original query and normalized version
      let appLocations: any[] = [];
      
      const { data: data1, error: error1 } = await supabase
        .from('locations')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(50);
      
      if (!error1 && data1) {
        appLocations = [...data1];
      }
      
      // Also search with normalized query if different
      if (normalizedQuery !== query && normalizedQuery.length >= 2) {
        const { data: data2, error: error2 } = await supabase
          .from('locations')
          .select('*')
          .ilike('name', `%${normalizedQuery}%`)
          .limit(50);
        
        if (!error2 && data2) {
          // Add unique results only
          const existingIds = new Set(appLocations.map(l => l.id));
          appLocations = [...appLocations, ...data2.filter(l => !existingIds.has(l.id))];
        }
      }

      // Calculate relevance for existing locations
      let existingResults: any[] = appLocations?.map(loc => {
        const latRaw = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
        const lngRaw = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
        const hasCoords = typeof latRaw === 'number' && typeof lngRaw === 'number';

        const distance = userLat && userLng && hasCoords
          ? calculateDistance(userLat, userLng, latRaw, lngRaw)
          : Infinity;
        
        const relevance = calculateRelevanceScore(
          query,
          loc.name,
          loc.address || loc.city || '',
          distance
        );
        
        return {
          id: loc.id,
          name: loc.name,
          address: loc.address || '',
          city: loc.city || '',
          lat: hasCoords ? latRaw : 0,
          lng: hasCoords ? lngRaw : 0,
          distance,
          category: loc.category,
          isExisting: true,
          relevance
        };
      }).filter(r => r.relevance >= 0.5) // Higher threshold to hide irrelevant results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10) || [];

      // Always search Nominatim for new locations
      const userLoc = userLat && userLng 
        ? { lat: userLat, lng: userLng }
        : undefined;
        
      const nominatimResults = await nominatimGeocoding.searchPlace(query, 'en', userLoc);
      
      // Filter Nominatim results to only include allowed categories using Nominatim-specific types
      const filteredNominatim = nominatimResults?.filter(r => {
        return isAllowedNominatimType(r.type, r.class);
      }) || [];
      
      const newLocationResults = filteredNominatim.map(r => {
        const distance = userLat && userLng 
          ? calculateDistance(userLat, userLng, r.lat, r.lng)
          : Infinity;
        const relevance = calculateRelevanceScore(query, r.displayName, r.address, distance);
        
        // Extract name (first part before comma)
        const namePart = r.displayName.split(',')[0].trim();
        
        return {
          name: namePart,
          address: r.address || r.displayName,
          city: r.city || '',
          streetName: r.streetName || '',
          streetNumber: r.streetNumber || '',
          lat: r.lat,
          lng: r.lng,
          isExisting: false,
          distance,
          relevance
        };
      }).filter(r =>
        r.relevance >= 0.5 && // Same threshold to hide irrelevant
        !existingResults.some(existing => 
          Math.abs(existing.lat - r.lat) < 0.001 && Math.abs(existing.lng - r.lng) < 0.001
        )
      ) || [];

      // Combine and sort by relevance
      let results = [...existingResults, ...newLocationResults]
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 20);

      // Remove duplicates by normalized name + rounded coordinates (4 decimal places = ~11m precision)
      const seen = new Map<string, any>();
      results = results.filter(result => {
        // Create key from normalized name + rounded coordinates
        const normalizedName = normalizeString(result.name.split(',')[0]);
        const roundedLat = result.lat.toFixed(4);
        const roundedLng = result.lng.toFixed(4);
        const coordKey = `${normalizedName}|${roundedLat},${roundedLng}`;
        
        // Also check just coordinates with less precision for same location different names
        const looseCoordKey = `${result.lat.toFixed(3)},${result.lng.toFixed(3)}`;
        
        if (seen.has(coordKey) || seen.has(looseCoordKey)) {
          // Keep the one with higher relevance (already sorted)
          return false;
        }
        seen.set(coordKey, result);
        seen.set(looseCoordKey, result);
        return true;
      });

      // Enrich top 5 results with street addresses if missing (parallel requests)
      const enrichedResults = await Promise.all(
        results.slice(0, 10).map(async (result, index) => {
          // Only enrich top 5 to avoid too many API calls
          if (index < 5 && !result.streetName && result.lat && result.lng) {
            return enrichAddressIfMissing(result);
          }
          return result;
        })
      );
      
      // Merge enriched results back
      results = [...enrichedResults, ...results.slice(10)];

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching locations:', error);
      toast.error('Errore durante la ricerca');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocations(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleShareLocation = async () => {
    if (!selectedLocation || !user) return;
    
    setLoading(true);
    try {
      let locationId = selectedLocation.id;

      // If location doesn't exist in the app, create it first
      if (!locationId) {
        const { data: newLocation, error: createError } = await supabase
          .from('locations')
          .insert({
            name: selectedLocation.name,
            address: selectedLocation.address,
            latitude: selectedLocation.coordinates.lat,
            longitude: selectedLocation.coordinates.lng,
            category: selectedLocation.category || 'restaurant',
            city: selectedLocation.address?.split(',')[0] || '',
            created_by: user.id,
            pioneer_user_id: user.id
          })
          .select()
          .single();

        if (createError) throw createError;
        locationId = newLocation.id;
      }

      const { error } = await supabase
        .from('user_location_shares')
        .insert({
          user_id: user.id,
          location_id: locationId,
          location_name: selectedLocation.name,
          location_address: selectedLocation.address,
          latitude: selectedLocation.coordinates.lat,
          longitude: selectedLocation.coordinates.lng,
          share_type: shareType,
          shared_with_user_ids: shareType === 'specific_users' ? selectedUsers : []
        });

      if (error) throw error;

      // Fetch user profile for correct username and avatar
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      const username = userProfile?.username || t('aFriend');
      const avatarUrl = userProfile?.avatar_url || null;

      // Send notifications for close_friends and specific_users shares
      if (shareType === 'close_friends' && closeFriends.length > 0) {
        // Create notifications for all close friends
        const notifications = closeFriends.map(friendId => ({
          user_id: friendId,
          type: 'location_share',
          title: t('sharedLocation'),
          message: t('userAtLocation', { username, location: selectedLocation.name }),
          data: {
            location_id: locationId,
            location_name: selectedLocation.name,
            location_address: selectedLocation.address,
            shared_by_user_id: user.id,
            shared_by_username: username,
            shared_by_avatar: avatarUrl
          }
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) console.error('Error creating notifications:', notifError);
      } else if (shareType === 'specific_users' && selectedUsers.length > 0) {
        // Create notifications for specific users
        const notifications = selectedUsers.map(userId => ({
          user_id: userId,
          type: 'location_share',
          title: t('sharedLocation'),
          message: t('userAtLocation', { username, location: selectedLocation.name }),
          data: {
            location_id: locationId,
            location_name: selectedLocation.name,
            location_address: selectedLocation.address,
            shared_by_user_id: user.id,
            shared_by_username: username,
            shared_by_avatar: avatarUrl
          }
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) console.error('Error creating notifications:', notifError);
      }

      toast.success(t('sharedSuccess'));
      navigate('/');
    } catch (error) {
      console.error('Error sharing location:', error);
      toast.error(t('shareError'));
    } finally {
      setLoading(false);
    }
  };

  // Format address wrapper using shared utility
  const formatDisplayAddress = (name: string, address: string, city?: string, streetName?: string, streetNumber?: string): string => {
    return formatSearchResultAddress({ name, address, city, streetName, streetNumber });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background pt-safe">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-32 pb-safe">
        {/* Search Bar */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder={tCommon('searchPlace')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="pl-10"
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
          {isSearchFocused && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setIsSearchFocused(false);
                // Blur active element to hide keyboard
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
            >
              {tCommon('cancel')}
            </Button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{tCommon('searchResults')}</h3>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-2 scrollbar-hide">
              {searchResults.map((result, index) => (
                <button
                  key={result.id || index}
                  onClick={() => {
                    setSelectedLocation({
                      id: result.id,
                      name: result.name,
                      address: result.address,
                      coordinates: { lat: result.lat, lng: result.lng },
                      category: result.category
                    });
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchFocused(false);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {result.category && (
                        <img 
                          src={getCategoryImage(result.category)} 
                          alt={result.category}
                          className="h-8 w-8 shrink-0 object-contain"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{formatDisplayAddress(result.name, result.address, result.city, result.streetName, result.streetNumber)}</p>
                      </div>
                    </div>
                    {result.distance !== undefined && result.distance !== Infinity && (
                      <p className="text-xs text-muted-foreground shrink-0">{result.distance.toFixed(1)} km</p>
                    )}
                  </div>
                  {!result.isExisting && (
                    <p className="text-xs text-primary mt-1">{tCommon('newLocationWillBeAdded')}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Locations - Only show if no location is selected */}
        {!searchQuery && !selectedLocation && nearbyLocations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{tCommon('nearbyPlaces')}</h3>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-2 scrollbar-hide">
              {nearbyLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className="w-full text-left p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {loc.category && (
                          <img 
                            src={getCategoryImage(loc.category)} 
                            alt={loc.category}
                            className="h-8 w-8 shrink-0 object-contain"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{loc.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{formatDisplayAddress(loc.name, loc.address, loc.city, loc.streetName, loc.streetNumber)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{loc.distance.toFixed(1)} km</p>
                    </div>
                  </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Location */}
        {selectedLocation && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary">
              <div className="flex items-center gap-3">
                {selectedLocation.category && (
                  <img 
                    src={getCategoryImage(selectedLocation.category)} 
                    alt={selectedLocation.category}
                    className="h-10 w-10 shrink-0 object-contain"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedLocation.name}</p>
                  {!shareType || isEditingShareType ? (
                    <p className="text-sm text-muted-foreground truncate">{selectedLocation.address}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLocation(null)}
                  className="shrink-0"
                >
                  {t('edit')}
                </Button>
              </div>
            </div>

            {/* Share Type Selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('shareWith')}</h3>
              
              {isEditingShareType ? (
                <>
                  <button
                    onClick={() => {
                      setShareType('all_followers');
                      setIsEditingShareType(false);
                      setShowCloseFriendsAvatars(false);
                      setShowSpecificUsersSearch(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    <Users className="h-5 w-5 shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{t('allFollowers')}</p>
                      <p className="text-sm text-muted-foreground">{t('visibleToAll')}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShareType('close_friends');
                      setIsEditingShareType(false);
                      setShowCloseFriendsAvatars(true);
                      setShowSpecificUsersSearch(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    <UserCheck className="h-5 w-5 shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{t('closeFriends')}</p>
                      <p className="text-sm text-muted-foreground">{t('onlyCloseFriends', { count: closeFriends.length })}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShareType('specific_users');
                      setIsEditingShareType(false);
                      setShowCloseFriendsAvatars(false);
                      setShowSpecificUsersSearch(true);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                  >
                    <User className="h-5 w-5 shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{t('specificUsers')}</p>
                      <p className="text-sm text-muted-foreground">{t('chooseManually')}</p>
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsEditingShareType(true);
                    setShowCloseFriendsAvatars(false);
                    setShowSpecificUsersSearch(false);
                  }}
                  className="w-full p-4 rounded-xl border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      {shareType === 'all_followers' && <Users className="h-5 w-5 shrink-0" />}
                      {shareType === 'close_friends' && <UserCheck className="h-5 w-5 shrink-0" />}
                      {shareType === 'specific_users' && <User className="h-5 w-5 shrink-0" />}
                      <p className="font-medium text-left">
                        {shareType === 'all_followers' && t('allFollowers')}
                        {shareType === 'close_friends' && t('closeFriends')}
                        {shareType === 'specific_users' && t('specificUsers')}
                      </p>
                    </div>
                    <span className="text-sm text-primary shrink-0">{t('edit')}</span>
                  </div>
                </button>
              )}
            </div>

            {/* Close Friends Avatars */}
            {shareType === 'close_friends' && showCloseFriendsAvatars && closeFriendsProfiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('closeFriends')} ({closeFriendsProfiles.length})</h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {closeFriendsProfiles.map((friend) => (
                    <div key={friend.id} className="flex flex-col items-center gap-1 min-w-fit">
                      <Avatar className="h-12 w-12 border-2 border-primary">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-xs text-center max-w-[60px] truncate">{friend.username}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Selection for specific users */}
            {shareType === 'specific_users' && showSpecificUsersSearch && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('selectUsers')}</h3>
                
                {/* User Search Bar */}
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder={t('searchUsers')}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      onFocus={() => setIsUserSearchFocused(true)}
                      className="pl-3"
                    />
                  </div>
                  {isUserSearchFocused && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setUserSearchQuery('');
                        setIsUserSearchFocused(false);
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }}
                    >
                      {tCommon('cancel')}
                    </Button>
                  )}
                </div>

                {/* Selected Users Avatars */}
                {selectedUsers.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedUsers.map((userId) => {
                      const user = followers.find(f => f.id === userId);
                      if (!user) return null;
                      return (
                        <div key={userId} className="relative">
                          <Avatar className="h-12 w-12 border-2 border-primary">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <button
                            onClick={() => toggleUserSelection(userId)}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* User List */}
                <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-hide">
                  {followers
                    .filter(follower => 
                      follower.username.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .map((follower) => (
                      <button
                        key={follower.id}
                        onClick={() => toggleUserSelection(follower.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          selectedUsers.includes(follower.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={follower.avatar_url || undefined} />
                          <AvatarFallback>{follower.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{follower.username}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Share Button */}
            <Button
              onClick={handleShareLocation}
              disabled={loading || isEditingShareType || (shareType === 'specific_users' && selectedUsers.length === 0)}
              className="w-full rounded-xl"
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('shareButton')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareLocationPage;