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
import PinShareModal from './PinShareModal';
import LocationReviewModal from './LocationReviewModal';
import LocationPostLibrary from './LocationPostLibrary';
import { getCategoryColor } from '@/utils/categoryIcons';
import { normalizeCity } from '@/utils/cityNormalization';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { useLocationStats } from '@/hooks/useLocationStats';

interface CompactLocationCardProps {
  place: Place;
  onCardClick: (place: Place) => void;
}

const CompactLocationCard = ({ place, onCardClick }: CompactLocationCardProps) => {
  const { isLiked, isSaved, toggleLike, toggleSave } = usePlaceEngagement();
  const { engagement } = usePinEngagement(place.id, place.google_place_id || null);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [smartImage, setSmartImage] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const { cityLabel } = useNormalizedCity({
    id: place.google_place_id || place.id,
    city: place.city,
    name: place.name,
    coordinates: place.coordinates,
    address: place.address || null
  });

  const { stats } = useLocationStats(place.id, place.google_place_id || null);

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

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await toggleSave(place);
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
        className="overflow-hidden cursor-pointer group bg-card hover:shadow-lg transition-all duration-300 rounded-2xl border border-border"
        onClick={handleCardClick}
      >
        {/* Image Section - More compact */}
        <div className="relative aspect-video w-full">
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
          
          {/* Category Badge - Top Left */}
          <div className="absolute top-3 left-3">
            <Badge className={`${getCategoryColor(place.category)} bg-background/95 backdrop-blur-sm text-xs px-3 py-1 rounded-full border-0 font-semibold shadow-lg`}>
              {formatCategory(place.category)}
            </Badge>
          </div>

          {/* Post Count Badge - Top Right */}
          {getPostCount() > 0 && (
            <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm text-foreground px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg border border-border">
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold">{getPostCount()}</span>
            </div>
          )}

          {/* Gradient Overlay at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Content Section */}
        <CardContent className="p-3 space-y-2">
          {/* Place Name */}
          <div>
            <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1 mb-0.5">
              {place.name}
            </h3>
            {/* City Name */}
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{getCityName()}</span>
            </div>
          </div>

          {/* Stats Row - Inline with icons */}
          <div className="flex items-center gap-3 text-xs">
            {/* Saves */}
            <div className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">{stats.totalSaves || 0}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-foreground">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
              </span>
            </div>

            {/* Posts */}
            <div className="flex items-center gap-1 ml-auto">
              <Camera className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">{getPostCount()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={`h-8 rounded-xl font-semibold text-xs transition-all ${
                isSaved(place.id)
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              } ${isSaving ? 'animate-pulse' : ''}`}
            >
              <Bookmark className={`w-3.5 h-3.5 mr-1 ${isSaved(place.id) ? 'fill-current' : ''}`} />
              {isSaved(place.id) ? 'Saved' : 'Save'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 rounded-xl font-semibold text-xs"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        place={place}
      />

      <PinShareModal
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
