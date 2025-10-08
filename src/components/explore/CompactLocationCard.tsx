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
    return cityLabel;
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
        className="overflow-hidden cursor-pointer group bg-white mx-2 mb-2 rounded-lg border-0 shadow-sm hover:shadow-md transition-all duration-300"
        onClick={handleCardClick}
      >
        <div className="relative">
          {/* Ultra Compact Image */}
          <div className="aspect-[2/1] overflow-hidden rounded-t-lg relative">
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
                <MapPin className="w-6 h-6 text-white/80" />
              </div>
            )}
            
            {/* Post Count Badge */}
            {getPostCount() > 0 && (
              <div className="absolute top-1.5 right-1.5 bg-black/70 text-white px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Camera className="w-2.5 h-2.5" />
                <span className="text-xs font-medium">{getPostCount()}</span>
              </div>
            )}
          </div>
          
          {/* Category Badge */}
          <div className="absolute top-1.5 left-1.5">
            <Badge className={`${getCategoryColor(place.category)} bg-white/95 backdrop-blur-sm text-xs px-1.5 py-0.5 rounded-md border-0 font-medium shadow-sm`}>
              {formatCategory(place.category)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-3">
          <div className="space-y-1.5">
            {/* Place Name */}
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">
              {place.name}
            </h3>

            {/* Location Row */}
            <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
              <div className="flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-gray-400" />
                <span className="font-medium">{getCityName()}</span>
              </div>
              {getDistanceText() && (
                <span className="font-medium">{getDistanceText()}</span>
              )}
              {stats.averageRating && (
                <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-700">{stats.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Compact Stats Row */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 text-red-500" />
                  <span className="font-semibold text-gray-700">{place.likes || 0}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5 text-blue-500" />
                  <span className="font-semibold text-gray-700">{engagement?.totalSaves || 0}</span>
                </div>
                {engagement && engagement.followedUsers.length > 0 && (
                  <div className="flex items-center -space-x-1.5">
                    {engagement.followedUsers.slice(0, 3).map((user) => (
                      <Avatar key={user.id} className="w-4 h-4 border-2 border-white">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-[8px]">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* New Action Buttons Style */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className={`h-auto py-2 px-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                  isSaved(place.id)
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                } ${isSaving ? 'animate-pulse' : ''}`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved(place.id) ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-medium">Saved</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setReviewModalOpen(true);
                }}
                className="h-auto py-2 px-2 rounded-2xl flex flex-col items-center gap-1 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
              >
                <Star className="w-4 h-4" />
                <span className="text-[10px] font-medium">Review</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="h-auto py-2 px-2 rounded-2xl flex flex-col items-center gap-1 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] font-medium">Directions</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-auto py-2 px-2 rounded-2xl flex flex-col items-center gap-1 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-[10px] font-medium">Share</span>
              </Button>
            </div>
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
