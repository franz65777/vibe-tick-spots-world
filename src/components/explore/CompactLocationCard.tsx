
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Bookmark, MessageCircle, Share2, MapPin, Star, Camera } from 'lucide-react';
import { Place } from '@/types/place';
import { usePlaceEngagement } from '@/hooks/usePlaceEngagement';
import { imageService } from '@/services/imageService';
import CommentModal from './CommentModal';
import ShareModal from './ShareModal';
import LocationPostLibrary from './LocationPostLibrary';
import { getCategoryColor } from '@/utils/categoryIcons';

interface CompactLocationCardProps {
  place: Place;
  onCardClick: (place: Place) => void;
}

const CompactLocationCard = ({ place, onCardClick }: CompactLocationCardProps) => {
  const { isLiked, isSaved, toggleLike, toggleSave } = usePlaceEngagement();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [smartImage, setSmartImage] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    loadSmartImage();
  }, [place]);

  const loadSmartImage = async () => {
    setImageLoading(true);
    try {
      // Use existing image if available, otherwise fetch smart image
      if (place.image) {
        setSmartImage(place.image);
      } else {
        // Generate location-specific image using AI
        const image = await imageService.getPlaceImage(
          place.name,
          place.city || 'Unknown',
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
    return place.city || 'Nearby';
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
        className="overflow-hidden cursor-pointer group bg-white mx-3 mb-4 rounded-xl border-0 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
        onClick={handleCardClick}
      >
        <div className="relative">
          {/* Compact Image - Reduced height */}
          <div className="aspect-[16/10] overflow-hidden rounded-t-xl relative">
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
            
            {/* Post Count Badge */}
            {getPostCount() > 0 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full flex items-center gap-1">
                <Camera className="w-3 h-3" />
                <span className="text-xs font-medium">{getPostCount()}</span>
              </div>
            )}
          </div>
          
          {/* Category and Status Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge className={`${getCategoryColor(place.category)} bg-white/95 backdrop-blur-sm text-xs px-2 py-0.5 rounded-md border-0 font-medium shadow-sm`}>
              {formatCategory(place.category)}
            </Badge>
            {place.isNew && (
              <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-md border-0 font-medium shadow-sm">
                New
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Place Name - Reduced spacing */}
            <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-1">
              {place.name}
            </h3>

            {/* Location Row - More compact */}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="font-medium">{getCityName()}</span>
              </div>
              {getDistanceText() && (
                <span className="font-medium">{getDistanceText()}</span>
              )}
            </div>

            {/* Compact Stats Row */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" />
                  <span className="font-semibold text-gray-700">{place.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-blue-500" />
                  <span className="font-semibold text-gray-700">{place.totalSaves || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-green-500" />
                  <span className="font-semibold text-gray-700">0</span>
                </div>
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={`h-8 rounded-lg flex flex-col gap-0.5 transition-all text-xs ${
                  isLiked(place.id)
                    ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                } ${isLiking ? 'animate-pulse' : ''}`}
              >
                <Heart className={`w-3 h-3 ${isLiked(place.id) ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Like</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className={`h-8 rounded-lg flex flex-col gap-0.5 transition-all text-xs ${
                  isSaved(place.id)
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                } ${isSaving ? 'animate-pulse' : ''}`}
              >
                <Bookmark className={`w-3 h-3 ${isSaved(place.id) ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Save</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="h-8 rounded-lg flex flex-col gap-0.5 text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all text-xs"
              >
                <MessageCircle className="w-3 h-3" />
                <span className="text-xs font-medium">Comment</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-8 rounded-lg flex flex-col gap-0.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all text-xs"
              >
                <Share2 className="w-3 h-3" />
                <span className="text-xs font-medium">Share</span>
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

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        place={place}
      />

      <LocationPostLibrary
        isOpen={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        place={place}
      />
    </>
  );
};

export default CompactLocationCard;
