
import React, { useState, useEffect } from 'react';
import { MapPin, Heart, Bookmark, Users, MessageSquare, Share2, Navigation, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { locationInteractionService } from '@/services/locationInteractionService';
import { LocationShareModal } from './LocationShareModal';
import LocationReviewModal from './LocationReviewModal';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { useLocationStats } from '@/hooks/useLocationStats';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import type { SaveTag } from '@/utils/saveTags';
import { useFeaturedInLists } from '@/hooks/useFeaturedInLists';
import TripDetailModal from '../profile/TripDetailModal';
import FolderDetailModal from '../profile/FolderDetailModal';

interface EnhancedLocationCardProps {
  place: any;
  onCardClick: (place: any) => void;
}

const EnhancedLocationCard = ({ place, onCardClick }: EnhancedLocationCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('general');
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [tripDetailOpen, setTripDetailOpen] = useState(false);
  const [folderDetailOpen, setFolderDetailOpen] = useState(false);
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(user?.id);

  const isMuted = mutedLocations?.some((m: any) => m.location_id === place.id);

  const { cityLabel } = useNormalizedCity({
    id: place.google_place_id || place.id,
    city: place.city,
    name: place.name,
    coordinates: place.coordinates,
    address: place.address
  });

  const { stats } = useLocationStats(place.id, place.google_place_id);
  const { lists: featuredLists, isLoading: listsLoading } = useFeaturedInLists(
    place.id,
    place.google_place_id
  );

  useEffect(() => {
    const checkInteractions = async () => {
      if (!place.id) return;

      try {
        const [liked, saved, count] = await Promise.all([
          locationInteractionService.isLocationLiked(place.id),
          locationInteractionService.isLocationSaved(place.id),
          locationInteractionService.getLocationLikeCount(place.id)
        ]);
        
        setIsLiked(liked);
        setIsSaved(saved);
        setLikeCount(count);

        if (saved) {
          const tag = await locationInteractionService.getCurrentSaveTag(
            place.google_place_id || place.id
          );
          setCurrentSaveTag((tag as SaveTag) || 'general');
        } else {
          setCurrentSaveTag('general');
        }
      } catch (error) {
        console.error('Error checking interactions:', error);
      }
    };

    checkInteractions();
  }, [place.id, place.google_place_id]);

  // Listen for global save changes
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved: newSavedState, saveTag } = event.detail;
      if (locationId === place.id || locationId === place.google_place_id) {
        setIsSaved(newSavedState);
        if (saveTag) {
          setCurrentSaveTag(saveTag as SaveTag);
        } else if (!newSavedState) {
          setCurrentSaveTag('general');
        }
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [place.id, place.google_place_id]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    
    try {
      const result = await locationInteractionService.toggleLocationLike(place.id);
      setIsLiked(result.liked);
      setLikeCount(result.count);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToggle = async (tag: SaveTag) => {
    setLoading(true);
    
    try {
      await locationInteractionService.saveLocation(place.id, {
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        latitude: place.coordinates?.lat || 0,
        longitude: place.coordinates?.lng || 0,
        category: place.category,
        types: place.types || []
      }, tag);
      setIsSaved(true);
      setCurrentSaveTag(tag);
      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId: place.id, isSaved: true, saveTag: tag } 
      }));
      if (place.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: place.google_place_id, isSaved: true, saveTag: tag }
        }));
      }
    } catch (error) {
      console.error('Error saving location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async () => {
    setLoading(true);
    
    try {
      await locationInteractionService.unsaveLocation(place.id);
      setIsSaved(false);
      setCurrentSaveTag('general');
      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId: place.id, isSaved: false } 
      }));
      if (place.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: place.google_place_id, isSaved: false }
        }));
      }
    } catch (error) {
      console.error('Error unsaving location:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = () => {
    // Smart image loading based on category
    const categoryImages: Record<string, string> = {
      'restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      'cafe': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      'bar': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      'hotel': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
      'attraction': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      'shopping': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
      'park': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop'
    };

    // Return existing image or category-based fallback
    return place.image || categoryImages[place.category] || categoryImages['attraction'];
  };

  return (
    <div 
      className="bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 group mx-4 mb-3 border-[1.5px] border-transparent
        [background:linear-gradient(var(--tw-gradient-stops))_padding-box,linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box]
        [background-clip:padding-box,border-box]"
      onClick={() => onCardClick(place)}
    >
    <div className="relative h-36 overflow-hidden rounded-t-xl">
      <img
          src={getImageUrl()} 
          alt={place.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        
        {/* Rating badge (top right) */}
        {stats.averageRating && (
          <div className="absolute top-2 right-2">
            <div className={cn("backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg", getRatingFillColor(stats.averageRating) + "/20")}>
              {(() => {
                const CategoryIcon = place.category ? getCategoryIcon(place.category) : Star;
                return <CategoryIcon className={cn("w-3 h-3", getRatingFillColor(stats.averageRating), getRatingColor(stats.averageRating))} />;
              })()}
              <span className={cn(getRatingColor(stats.averageRating))}>{stats.averageRating.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Post count badge */}
        {place.postCount && place.postCount > 0 && !stats.averageRating && (
          <div className="absolute top-2 right-2">
            <div className="bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {place.postCount}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Optimized Content section */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-base leading-tight mb-1">{place.name}</h3>
            <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="text-xs">{cityLabel || 'Unknown location'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Optimized Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-destructive" />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-primary" />
            <span>{place.visitors?.length || 0}</span>
          </div>
          {place.distance && (
            <div className="flex items-center gap-1">
              <span className="text-primary">•</span>
              <span>{typeof place.distance === 'number' ? `${place.distance.toFixed(1)}km` : place.distance}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex-col h-auto py-3 gap-1 rounded-2xl bg-secondary flex items-center justify-center">
            <SaveLocationDropdown
              isSaved={isSaved}
              onSave={handleSaveToggle}
              onUnsave={handleUnsave}
              disabled={loading}
              variant="ghost"
              size="icon"
              currentSaveTag={currentSaveTag}
            />
            <span className="text-xs">{t(isSaved ? 'saved' : 'save', { ns: 'common' })}</span>
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsReviewModalOpen(true);
            }}
            size="sm"
            variant="secondary"
            className="flex-col h-auto py-3 gap-1 rounded-2xl"
          >
            <Star className="w-5 h-5" />
            <span className="text-xs">{t('review', { ns: 'explore' })}</span>
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              const coords = `${place.coordinates.lat},${place.coordinates.lng}`;
              const url = isIOS 
                ? `maps://maps.apple.com/?daddr=${coords}`
                : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
              window.open(url, '_blank');
            }}
            size="sm"
            variant="secondary"
            className="flex-col h-auto py-3 gap-1 rounded-2xl"
          >
            <Navigation className="w-5 h-5" />
            <span className="text-xs">{t('directions', { ns: 'explore' })}</span>
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsShareModalOpen(true);
            }}
            size="sm"
            variant="secondary"
            className="flex-col h-auto py-3 gap-1 rounded-2xl"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs">{t('share', { ns: 'common' })}</span>
          </Button>

        </div>

        {/* Featured in Lists Section */}
        {!listsLoading && featuredLists.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              📌 Featured in Lists
            </h4>
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {featuredLists.map((list) => (
                  <button
                    key={list.list_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (list.type === 'folder') {
                      setSelectedFolderId(list.list_id);
                      setFolderDetailOpen(true);
                    } else {
                      setSelectedTripId(list.list_id);
                      setTripDetailOpen(true);
                    }
                  }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted hover:bg-accent rounded-full border border-border text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <span>{list.is_own ? '📝' : '👥'}</span>
                    <span className="text-foreground">
                      {list.is_own ? list.list_name : `${list.username}'s ${list.list_name}`}
                    </span>
                  </button>
                ))}
              </div>
      </div>
    </div>
        )}
      </div>
      
      {/* Share Modal */}
      <LocationShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        place={place}
      />

      {/* Review Modal */}
      <LocationReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        location={{
          id: place.id,
          name: place.name,
          google_place_id: place.google_place_id
        }}
      />

      {/* Trip Detail Modal */}
      {selectedTripId && tripDetailOpen && (
        <TripDetailModal
          tripId={selectedTripId}
          isOpen={tripDetailOpen}
          onClose={() => {
            setSelectedTripId(null);
            setTripDetailOpen(false);
          }}
        />
      )}

      {/* Folder Detail Modal */}
      {selectedFolderId && folderDetailOpen && (
        <FolderDetailModal
          folderId={selectedFolderId}
          isOpen={folderDetailOpen}
          onClose={() => {
            setSelectedFolderId(null);
            setFolderDetailOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedLocationCard;
