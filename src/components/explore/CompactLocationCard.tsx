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
        className="overflow-hidden cursor-pointer group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-[320px] flex flex-col"
        onClick={handleCardClick}
      >
        {/* Image Section - Fixed Height */}
        <div className="relative h-[140px] flex-shrink-0">
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
              <MapPin className="w-8 h-8 text-white/80" />
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <Badge className={`${getCategoryColor(place.category)} bg-white/95 backdrop-blur-sm text-xs px-2 py-1 rounded-lg border-0 font-semibold shadow-md`}>
              {formatCategory(place.category)}
            </Badge>
          </div>

          {/* Post Count Badge */}
          {getPostCount() > 0 && (
            <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
              <Camera className="w-3 h-3" />
              <span className="text-xs font-bold">{getPostCount()}</span>
            </div>
          )}
        </div>

        {/* Content Section - Fixed Height with flex layout */}
        <CardContent className="p-2.5 flex flex-col flex-1">
          {/* Place Name - Single line with ellipsis */}
          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate mb-1">
            {place.name}
          </h3>

          {/* City Name - Prominent */}
          <div className="flex items-center gap-1 mb-1.5">
            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-700 truncate">{getCityName()}</span>
          </div>

          {/* Stats Grid - Compact for mobile */}
          <div className="grid grid-cols-3 gap-1.5 mb-2 flex-shrink-0">
            {/* Posts Count */}
            <div className="flex flex-col items-center bg-gray-50 rounded-lg py-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
              <span className="text-xs font-bold text-gray-900">{getPostCount()}</span>
              <span className="text-[9px] text-gray-500 font-medium">Posts</span>
            </div>

            {/* Saves Count */}
            <div className="flex flex-col items-center bg-gray-50 rounded-lg py-1.5">
              <Bookmark className="w-3.5 h-3.5 text-purple-600 mb-0.5" />
              <span className="text-xs font-bold text-gray-900">{stats.totalSaves || 0}</span>
              <span className="text-[9px] text-gray-500 font-medium">Saves</span>
            </div>

            {/* Average Rating */}
            <div className="flex flex-col items-center bg-yellow-50 rounded-lg py-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 mb-0.5" />
              <span className="text-xs font-bold text-gray-900">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Rating</span>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="mt-auto grid grid-cols-2 gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={`h-8 rounded-lg flex items-center justify-center gap-1 transition-all text-xs ${
                isSaved(place.id)
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isSaving ? 'animate-pulse' : ''}`}
            >
              <Bookmark className={`w-3 h-3 ${isSaved(place.id) ? 'fill-current' : ''}`} />
              <span className="font-semibold">{isSaved(place.id) ? 'Saved' : 'Save'}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 rounded-lg flex items-center justify-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all text-xs"
            >
              <Share2 className="w-3 h-3" />
              <span className="font-semibold">Share</span>
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
