import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Bookmark, MessageCircle, Share2, MapPin, Star, Camera, Users } from 'lucide-react';
import { Place } from '@/types/place';
import { usePlaceEngagement } from '@/hooks/usePlaceEngagement';
import { usePinEngagement } from '@/hooks/usePinEngagement';
import { imageService } from '@/services/imageService';
import CommentModal from './CommentModal';
import { LocationShareModal } from './LocationShareModal';
import LocationReviewModal from './LocationReviewModal';
import LocationPostLibrary from './LocationPostLibrary';
import { getCategoryColor, getCategoryIcon } from '@/utils/categoryIcons';
import { normalizeCity } from '@/utils/cityNormalization';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { useLocationStats } from '@/hooks/useLocationStats';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useAuth } from '@/contexts/AuthContext';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import type { SaveTag } from '@/utils/saveTags';
import { locationInteractionService } from '@/services/locationInteractionService';

interface CompactLocationCardProps {
  place: Place;
  onCardClick: (place: Place) => void;
}

const CompactLocationCard = ({ place, onCardClick }: CompactLocationCardProps) => {
  const { user } = useAuth();
  const { isLiked, isSaved, toggleLike, refetch } = usePlaceEngagement();
  const { engagement } = usePinEngagement(place.id, place.google_place_id || null);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('been');
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [smartImage, setSmartImage] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(user?.id);
  const { cityLabel } = useNormalizedCity({
    id: place.google_place_id || place.id,
    city: place.city,
    name: place.name,
    coordinates: place.coordinates,
    address: place.address || null
  });

  const { stats } = useLocationStats(place.id, place.google_place_id || null);
 
  const isMuted = mutedLocations?.some((m: any) => m.location_id === place.id);

  useEffect(() => {
    loadSmartImage();
  }, [place]);

  const loadSmartImage = async () => {
    setImageLoading(true);
    try {
      if (place.image) {
        setSmartImage(place.image);
      } else {
        const image = await imageService.getPlaceImage(
          place.name,
          cityLabel || 'Unknown',
          place.category
        );
        setSmartImage(image);
      }
    } catch (error) {
      console.error('Error loading smart image:', error);
      setSmartImage('');
    } finally {
      setImageLoading(false);
    }
  };

  // Load current save tag on mount and when place changes
  useEffect(() => {
    const fetchSaveTag = async () => {
      if (!place.id) return;
      try {
        const saved = await locationInteractionService.isLocationSaved(place.id);
        if (saved) {
          const tag = await locationInteractionService.getCurrentSaveTag(place.google_place_id || place.id);
          setCurrentSaveTag((tag as SaveTag) || 'been');
        } else {
          setCurrentSaveTag('been');
        }
      } catch (error) {
        console.error('Error fetching save tag:', error);
      }
    };

    fetchSaveTag();
  }, [place.id, place.google_place_id]);

  // Keep save tag in sync when updated elsewhere
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved: newSavedState, saveTag } = event.detail;
      if (locationId === place.id || locationId === place.google_place_id) {
        if (newSavedState && saveTag) {
          setCurrentSaveTag(saveTag as SaveTag);
        } else if (!newSavedState) {
          setCurrentSaveTag('been');
        }
      }
    };

    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [place.id, place.google_place_id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      await toggleLike(place.id);
    } finally {
      setTimeout(() => setIsLiking(false), 300);
    }
  };

  const handleSave = async (tag: SaveTag) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const locationData = place.google_place_id ? {
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        latitude: place.coordinates?.lat,
        longitude: place.coordinates?.lng,
        category: place.category
      } : null;
      
      await locationInteractionService.saveLocation(place.id, locationData, tag);
      setCurrentSaveTag(tag);
      // Refetch engagement to update state
      await refetch();
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
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  const handleUnsave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await locationInteractionService.unsaveLocation(place.id);
      setCurrentSaveTag('been');
      // Refetch engagement to update state
      await refetch();
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
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentModalOpen(true);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareModalOpen(true);
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      unmuteLocation(place.id);
    } else {
      muteLocation(place.id);
    }
  };

  const handleCardClick = () => {
    setLibraryModalOpen(true);
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getDistanceText = () => {
    if (typeof place.distance === 'string') return place.distance;
    if (typeof place.distance === 'number') return `${place.distance.toFixed(1)}km`;
    return '';
  };

  const getCityName = () => {
    return cityLabel || 'Unknown City';
  };

  const getPlaceholderGradient = () => {
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-orange-400 to-orange-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
    ];
    const colorIndex = place.id.length % colors.length;
    return colors[colorIndex];
  };

  const getPostCount = () => {
    return place.postCount || 0;
  };

  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer group bg-card hover:shadow-lg transition-all duration-300 rounded-xl border border-border h-[240px] flex flex-col"
        onClick={handleCardClick}
      >
        {/* Image Section with Overlay Content */}
        <div className="relative flex-1 w-full">
          {imageLoading ? (
            <div className={`w-full h-full ${getPlaceholderGradient()} animate-pulse`} />
          ) : smartImage ? (
            <img
              src={smartImage}
              alt={place.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full ${getPlaceholderGradient()} flex items-center justify-center`}>
              <MapPin className="w-12 h-12 text-white/80" />
            </div>
          )}
          
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Category Badge - Top Left */}
          <div className="absolute top-2 left-2">
            <Badge className={`${getCategoryColor(place.category)} bg-background/95 backdrop-blur-sm text-xs px-2.5 py-0.5 rounded-full border-0 font-semibold shadow-lg`}>
              {formatCategory(place.category)}
            </Badge>
          </div>

          {/* Save Button - Top Right */}
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            <SaveLocationDropdown
              isSaved={isSaved(place.id)}
              onSave={handleSave}
              onUnsave={handleUnsave}
              disabled={isSaving}
              variant="secondary"
              size="icon"
              currentSaveTag={currentSaveTag}
            />
          </div>

          {/* Content Overlay at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
            {/* Place Name and City */}
            <div>
              <h3 className="font-bold text-white text-base leading-tight line-clamp-1 mb-1 drop-shadow-lg">
                {place.name}
              </h3>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-white/90 flex-shrink-0" />
                <span className="text-xs text-white/90 truncate drop-shadow">{getCityName()}</span>
              </div>
            </div>

            {/* Stats and Action Row */}
            <div className="flex items-center gap-2">
              {/* Stats */}
              <div className="flex items-center gap-2 text-xs flex-1">
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Camera className="w-3 h-3 text-white" />
                  <span className="font-semibold text-white">{getPostCount()}</span>
                </div>
                
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Bookmark className="w-3 h-3 text-white" />
                  <span className="font-semibold text-white">{stats.totalSaves || 0}</span>
                </div>
                
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                  {(() => {
                    const CategoryIcon = place.category ? getCategoryIcon(place.category) : Star;
                    const rating = stats.averageRating || 0;
                    return <CategoryIcon className={cn("w-3 h-3", getRatingFillColor(rating), getRatingColor(rating))} />;
                  })()}
                  <span className={cn("font-semibold text-white", stats.averageRating && getRatingColor(stats.averageRating))}>
                    {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
                  </span>
                </div>
              </div>

              {/* Mute & Share Buttons */}
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="h-7 w-7 rounded-full p-0 bg-white/95 hover:bg-white backdrop-blur-sm shadow-lg border-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        place={place}
      />

      <LocationShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        place={place}
      />

      <LocationReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        location={{
          id: place.id,
          name: place.name,
          google_place_id: place.google_place_id
        }}
      />

      {libraryModalOpen && (
        <LocationPostLibrary
          isOpen={libraryModalOpen}
          onClose={() => setLibraryModalOpen(false)}
          place={place}
        />
      )}
    </>
  );
};

export default CompactLocationCard;
