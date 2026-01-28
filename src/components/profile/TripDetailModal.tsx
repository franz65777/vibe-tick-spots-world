import { X, MapPin, Eye, Bookmark, MessageCircle, Users, Star, Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Trip, useTrips } from '@/hooks/useTrips';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TripChatModal from './TripChatModal';
import PinDetailCard from '@/components/explore/PinDetailCard';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/utils';
import { useLocationStats } from '@/hooks/useLocationStats';
import { useLocationSavers } from '@/hooks/useLocationSavers';
import { translateCategory } from '@/utils/translateCategory';

interface TripDetailModalProps {
  trip?: Trip | null;
  tripId?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to extract the first photo URL from the locations.photos JSONB column
const extractFirstPhotoUrl = (photos: unknown): string | null => {
  if (!photos) return null;
  const arr = Array.isArray(photos) ? photos : null;
  if (!arr) return null;
  for (const item of arr) {
    if (typeof item === 'string' && item.trim()) return item;
    if (item && typeof item === 'object') {
      const anyItem = item as any;
      const url = anyItem.url || anyItem.photo_url || anyItem.src;
      if (typeof url === 'string' && url.trim()) return url;
    }
  }
  return null;
};

// Determine which thumbnail to show: 1) business photo  2) Google photo  3) category icon
const getLocationThumbnail = (location: any): string | null => {
  if (location.image_url) return location.image_url;
  const googlePhoto = extractFirstPhotoUrl(location.photos);
  if (googlePhoto) return googlePhoto;
  return null;
};

const LocationCardWithStats = ({ location, notes, onClick }: { location: any; notes?: string; onClick: () => void }) => {
  const { t } = useTranslation('common');
  const { stats } = useLocationStats(location.id, location.google_place_id);
  const { savers } = useLocationSavers(location.id, 3);

  const thumbUrl = getLocationThumbnail(location);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
    >
      {thumbUrl ? (
        <img 
          src={thumbUrl} 
          alt={location.name}
          className="w-16 h-16 rounded-lg object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
          <CategoryIcon category={location.category} className="w-8 h-8" />
        </div>
      )}
      <div className="flex-1 min-w-0 text-left space-y-1">
        <h4 className="font-medium truncate">{location.name}</h4>
        <p className="text-sm text-muted-foreground truncate">
          {translateCategory(location.category, t)} • {location.city}
        </p>
        <div className="flex items-center gap-3 text-xs">
          {stats.averageRating && stats.averageRating > 0 && (
            <div className="flex items-center gap-1">
               {location.category === 'restaurant' || location.category === 'cafe' || location.category === 'bakery' ? (
                <Utensils className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Star className="w-3.5 h-3.5 fill-green-500 text-green-500" />
              )}
               <span 
                 className="font-bold" 
                 style={{
                   background: 'linear-gradient(to right, #10b981, #059669)',
                   WebkitBackgroundClip: 'text',
                   WebkitTextFillColor: 'transparent',
                   backgroundClip: 'text'
                 }}
               >
                 {stats.averageRating.toFixed(1)}
               </span>
            </div>
          )}
          {stats.totalSaves > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Bookmark className="w-3.5 h-3.5" />
              <span>{stats.totalSaves}</span>
            </div>
          )}
          {savers.length > 0 && (
            <div className="flex items-center -space-x-2">
              {savers.map((saver) => (
                <Avatar key={saver.id} className="w-5 h-5 ring-2 ring-background">
                  <AvatarImage src={saver.avatar_url} />
                  <AvatarFallback className="text-[8px]">{saver.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
        {notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notes}
          </p>
        )}
      </div>
    </button>
  );
};

const TripDetailModal = ({ trip: providedTrip, tripId, isOpen, onClose }: TripDetailModalProps) => {
  const { t } = useTranslation();
  const [trip, setTrip] = useState<Trip | null>(providedTrip || null);
  const [loading, setLoading] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId || providedTrip) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('trips')
          .select(`
            *,
            trip_locations (
              id,
              order_index,
              notes,
              location_id,
              google_place_id,
              locations (
                id,
                name,
                category,
                city,
                image_url,
                photos
              )
            )
          `)
          .eq('id', tripId)
          .single();

        if (error) throw error;

        // Fetch user profile separately
        if (data) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', data.user_id)
            .single();

          setTrip({ ...data, profiles: profile } as Trip);
        }
      } catch (error) {
        console.error('Error fetching trip:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchTrip();
      if (trip?.id) {
        loadParticipants();
      }
    }
  }, [tripId, providedTrip, isOpen, trip?.id]);

  const loadParticipants = async () => {
    if (!trip?.id) return;
    
    try {
      const { data } = await supabase
        .from('trip_participants')
        .select(`
          *,
          profiles (id, username, avatar_url)
        `)
        .eq('trip_id', trip.id);

      setParticipants(data?.map((p: any) => p.profiles).filter(Boolean) || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  useEffect(() => {
    if (providedTrip) {
      setTrip(providedTrip);
    }
  }, [providedTrip]);

  const handleClose = () => {
    setSelectedLocation(null);
    onClose();
  };

  if (!isOpen) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }
  if (!trip) return null;

  const locations = trip.trip_locations || [];

  return (
    <>
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in duration-200",
        selectedLocation && "hidden"
      )}
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-2xl bg-background rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
          {trip.cover_image_url ? (
            <img
              src={trip.cover_image_url}
              alt={trip.name}
              className="w-full h-full object-cover"
            />
          ) : locations[0]?.locations?.image_url ? (
            <img
              src={locations[0].locations.image_url}
              alt={trip.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <MapPin className="w-16 h-16 text-primary/40" />
          )}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {/* Title */}
          <h2 className="text-2xl font-bold">{trip.name}</h2>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{locations.length}</span>
              <span>places</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bookmark className="h-4 w-4" />
              <span className="font-medium">{t('savesCount', { count: trip.save_count || 0 })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{trip.view_count || 0}</span>
              <span>views</span>
            </div>
          </div>

          {/* User Info & Participants */}
          <div className="flex items-center justify-between">
            {trip.profiles && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={trip.profiles.avatar_url} />
                  <AvatarFallback>{trip.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">@{trip.profiles.username}</span>
              </div>
            )}

            {/* Show Chat Button if collaborative */}
            {participants.length > 1 && (
              <Button
                onClick={() => setShowChatModal(true)}
                variant="outline"
                size="sm"
                className="rounded-xl"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                <span>Chat</span>
                <Users className="w-4 h-4 ml-2 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{participants.length}</span>
              </Button>
            )}
          </div>

          {/* Description */}
          {trip.description && (
            <p className="text-foreground leading-relaxed">{trip.description}</p>
          )}

          {/* Locations */}
          {locations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Locations</h3>
              <div className="space-y-2">
                {locations.map((tripLocation: any) => {
                  const location = tripLocation.locations;
                  if (!location) return null;

                  return (
                    <LocationCardWithStats
                      key={tripLocation.id}
                      location={location}
                      notes={tripLocation.notes}
                      onClick={() => {
                        setSelectedLocation({
                          ...location,
                          coordinates: {
                            lat: location.latitude,
                            lng: location.longitude
                          }
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {showChatModal && trip && (
        <TripChatModal
          tripId={trip.id}
          tripName={trip.name}
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* Location Detail */}
      {selectedLocation && (
        <div className="fixed inset-0 z-[10010]">
          <PinDetailCard 
            place={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onBack={() => setSelectedLocation(null)}
          />
        </div>
      )}
    </>
  );
};

export default TripDetailModal;
