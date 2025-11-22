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

interface NearbyLocation {
  id: string;
  name: string;
  address: string;
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
  const { t } = useTranslation();
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
          address: loc.address || loc.city || '',
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

  const searchLocations = async (query: string) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      // First search in existing app locations
      const { data: appLocations, error } = await supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(20);

      if (error) throw error;

      // Calculate distance and sort by proximity
      let results: any[] = [];
      
      if (location?.latitude && location?.longitude) {
        results = appLocations?.map(loc => {
          const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
          const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
          const distance = calculateDistance(location.latitude!, location.longitude!, lat, lng);
          
          return {
            id: loc.id,
            name: loc.name,
            address: loc.address || loc.city || '',
            lat,
            lng,
            distance,
            category: loc.category,
            isExisting: true
          };
        }).sort((a, b) => a.distance - b.distance) || [];
      } else {
        results = appLocations?.map(loc => ({
          id: loc.id,
          name: loc.name,
          address: loc.address || loc.city || '',
          lat: typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude,
          lng: typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude,
          category: loc.category,
          isExisting: true
        })) || [];
      }

      // If not enough results, supplement with Nominatim (with user location for proximity)
      if (results.length < 5) {
        const userLoc = location?.latitude && location?.longitude 
          ? { lat: location.latitude, lng: location.longitude }
          : undefined;
          
        const nominatimResults = await nominatimGeocoding.searchPlace(query, 'en', userLoc);
        const externalResults = nominatimResults?.map(r => ({
          ...r,
          isExisting: false,
          distance: location?.latitude && location?.longitude 
            ? calculateDistance(location.latitude, location.longitude, r.lat, r.lng)
            : Infinity
        })).filter(r => !results.some(existing => 
          Math.abs(existing.lat - r.lat) < 0.001 && Math.abs(existing.lng - r.lng) < 0.001
        )) || [];
        
        results = [...results, ...externalResults].sort((a, b) => a.distance - b.distance);
      }

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

      const username = userProfile?.username || 'Un amico';
      const avatarUrl = userProfile?.avatar_url || null;

      // Send notifications for close_friends and specific_users shares
      if (shareType === 'close_friends' && closeFriends.length > 0) {
        // Create notifications for all close friends
        const notifications = closeFriends.map(friendId => ({
          user_id: friendId,
          type: 'location_share',
          title: 'Posizione condivisa',
          message: `${username} si trova ora presso ${selectedLocation.name}`,
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
          title: 'Posizione condivisa',
          message: `${username} si trova ora presso ${selectedLocation.name}`,
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

      toast.success('Posizione condivisa con successo!');
      navigate('/');
    } catch (error) {
      console.error('Error sharing location:', error);
      toast.error('Errore durante la condivisione');
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('sharePosition.title', 'Condividi Posizione')}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-6 pb-32 pb-safe">
        {/* Search Bar */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cerca un luogo..."
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
              Annulla
            </Button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Risultati ricerca</h3>
            <div className="relative max-h-[calc(100vh-280px)]">
              <div className="overflow-y-auto space-y-2 scrollbar-hide h-full">
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
                  className="w-full text-left p-4 rounded-lg border border-border hover:bg-accent transition-colors"
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
                        <p className="text-sm text-muted-foreground truncate">{result.address}</p>
                      </div>
                    </div>
                    {result.distance !== undefined && result.distance !== Infinity && (
                      <p className="text-xs text-muted-foreground shrink-0">{result.distance.toFixed(1)} km</p>
                    )}
                  </div>
                  {!result.isExisting && (
                    <p className="text-xs text-primary mt-1">Nuovo luogo - verrà aggiunto all'app</p>
                  )}
                </button>
                ))}
              </div>
              {/* Fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

        {/* Nearby Locations - Only show if no location is selected */}
        {!searchQuery && !selectedLocation && nearbyLocations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Luoghi nelle vicinanze</h3>
            <div className="relative max-h-[calc(100vh-280px)]">
              <div className="overflow-y-auto space-y-2 scrollbar-hide h-full">
                {nearbyLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:bg-accent transition-colors"
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
                          <p className="text-sm text-muted-foreground truncate">{loc.address}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{loc.distance.toFixed(1)} km</p>
                    </div>
                  </button>
                ))}
              </div>
              {/* Fade effect at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

        {/* Selected Location */}
        {selectedLocation && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary">
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
                  Modifica
                </Button>
              </div>
            </div>

            {/* Share Type Selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Condividi con</h3>
              
              {isEditingShareType ? (
                <>
                  <button
                    onClick={() => {
                      setShareType('all_followers');
                      setIsEditingShareType(false);
                      setShowCloseFriendsAvatars(false);
                      setShowSpecificUsersSearch(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <Users className="h-5 w-5 shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">Tutti i follower</p>
                      <p className="text-sm text-muted-foreground">Visibile a tutti</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShareType('close_friends');
                      setIsEditingShareType(false);
                      setShowCloseFriendsAvatars(true);
                      setShowSpecificUsersSearch(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <UserCheck className="h-5 w-5 shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">Amici stretti</p>
                      <p className="text-sm text-muted-foreground">Solo amici stretti ({closeFriends.length})</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShareType('specific_users');
                      setIsEditingShareType(false);
                      setShowCloseFriendsAvatars(false);
                      setShowSpecificUsersSearch(true);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <User className="h-5 w-5 shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">Utenti specifici</p>
                      <p className="text-sm text-muted-foreground">Scegli manualmente</p>
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
                  className="w-full p-4 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      {shareType === 'all_followers' && <Users className="h-5 w-5 shrink-0" />}
                      {shareType === 'close_friends' && <UserCheck className="h-5 w-5 shrink-0" />}
                      {shareType === 'specific_users' && <User className="h-5 w-5 shrink-0" />}
                      <p className="font-medium text-left">
                        {shareType === 'all_followers' && 'Tutti i follower'}
                        {shareType === 'close_friends' && 'Amici stretti'}
                        {shareType === 'specific_users' && 'Utenti specifici'}
                      </p>
                    </div>
                    <span className="text-sm text-primary shrink-0">Modifica</span>
                  </div>
                </button>
              )}
            </div>

            {/* Close Friends Avatars */}
            {shareType === 'close_friends' && showCloseFriendsAvatars && closeFriendsProfiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Amici stretti ({closeFriendsProfiles.length})</h3>
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
                <h3 className="text-sm font-medium">Seleziona utenti</h3>
                
                {/* User Search Bar */}
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Cerca utenti..."
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
                      Annulla
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
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
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
              className="w-full"
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Condividi Posizione
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareLocationPage;