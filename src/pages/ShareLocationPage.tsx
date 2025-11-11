import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Loader2, Users, UserCheck, User } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

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
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(5);

      if (error) throw error;

      // Calculate distance and sort
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
          coordinates: { lat, lng }
        };
      }).sort((a, b) => a.distance - b.distance).slice(0, 5) || [];

      setNearbyLocations(withDistance);
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
      setCloseFriends(data?.map(cf => cf.friend_id) || []);
    } catch (error) {
      console.error('Error fetching close friends:', error);
    }
  };

  const searchLocations = async (query: string) => {
    if (!query.trim() || !location) return;
    
    setSearching(true);
    try {
      const results = await nominatimGeocoding.searchPlace(query, 'en');
      setSearchResults(results || []);
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
      const { error } = await supabase
        .from('user_location_shares')
        .insert({
          user_id: user.id,
          location_id: selectedLocation.id || null,
          location_name: selectedLocation.name,
          location_address: selectedLocation.address,
          latitude: selectedLocation.coordinates.lat,
          longitude: selectedLocation.coordinates.lng,
          share_type: shareType,
          shared_with_user_ids: shareType === 'specific_users' ? selectedUsers : []
        });

      if (error) throw error;

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Condividi Posizione</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Input
            placeholder="Cerca un luogo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Risultati ricerca</h3>
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedLocation({
                    name: result.name,
                    address: result.address,
                    coordinates: { lat: result.lat, lng: result.lng }
                  });
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <p className="font-medium">{result.name}</p>
                <p className="text-sm text-muted-foreground">{result.address}</p>
              </button>
            ))}
          </div>
        )}

        {/* Nearby Locations */}
        {!searchQuery && nearbyLocations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Luoghi nelle vicinanze</h3>
            {nearbyLocations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedLocation?.id === loc.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-accent'
                }`}
              >
                <p className="font-medium">{loc.name}</p>
                <p className="text-sm text-muted-foreground">{loc.address}</p>
                <p className="text-xs text-muted-foreground mt-1">{loc.distance.toFixed(1)} km</p>
              </button>
            ))}
          </div>
        )}

        {/* Selected Location */}
        {selectedLocation && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary">
              <p className="font-medium">{selectedLocation.name}</p>
              <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
            </div>

            {/* Share Type Selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Condividi con</h3>
              
              <button
                onClick={() => setShareType('all_followers')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  shareType === 'all_followers' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}
              >
                <Users className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Tutti i follower</p>
                  <p className="text-sm text-muted-foreground">Visibile a tutti</p>
                </div>
              </button>

              <button
                onClick={() => setShareType('close_friends')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  shareType === 'close_friends' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}
              >
                <UserCheck className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Amici stretti</p>
                  <p className="text-sm text-muted-foreground">Solo amici stretti ({closeFriends.length})</p>
                </div>
              </button>

              <button
                onClick={() => setShareType('specific_users')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  shareType === 'specific_users' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}
              >
                <User className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Utenti specifici</p>
                  <p className="text-sm text-muted-foreground">Scegli manualmente</p>
                </div>
              </button>
            </div>

            {/* User Selection for specific users */}
            {shareType === 'specific_users' && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Seleziona utenti</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {followers.map((follower) => (
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
              disabled={loading || (shareType === 'specific_users' && selectedUsers.length === 0)}
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