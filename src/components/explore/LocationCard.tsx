import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Bookmark, MessageCircle, Share2, MapPin, Star } from 'lucide-react';
import { Place } from '@/types/place';
import { usePlaceEngagement } from '@/hooks/usePlaceEngagement';
import CommentModal from './CommentModal';
import ShareModal from './ShareModal';
import LocationPostLibrary from './LocationPostLibrary';
import { getCategoryColor } from '@/utils/categoryIcons';

interface LocationCardProps {
  place: Place;
  onCardClick: (place: Place) => void;
}

const LocationCard = ({ place, onCardClick }: LocationCardProps) => {
  const { isLiked, isSaved, toggleLike, toggleSave } = usePlaceEngagement();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);

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

  const getPlaceholderImage = () => {
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

  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer group bg-white mx-4 mb-6 rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        onClick={handleCardClick}
      >
        <div className="relative">
          {place.image ? (
            <div className="aspect-[4/3] overflow-hidden rounded-t-2xl">
              <img
                src={place.image}
                alt={place.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ) : (
            <div className={`aspect-[4/3] ${getPlaceholderImage()} rounded-t-2xl flex items-center justify-center`}>
              <MapPin className="w-12 h-12 text-white/80" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className={`${getCategoryColor(place.category)} bg-white/95 backdrop-blur-sm text-xs px-3 py-1 rounded-full border-0 font-medium shadow-sm`}>
              {formatCategory(place.category)}
            </Badge>
            {place.isNew && (
              <Badge className="bg-green-500 text-white text-xs px-3 py-1 rounded-full border-0 font-medium shadow-sm">
                New
              </Badge>
            )}
            {place.popularity && place.popularity > 80 && (
              <Badge className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full border-0 flex items-center gap-1 font-medium shadow-sm">
                <Star className="w-3 h-3" />
                Popular
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5">
          <div className="space-y-4">
            {/* Place Name */}
            <h3 className="font-bold text-gray-900 text-xl leading-tight line-clamp-2">
              {place.name}
            </h3>

            {/* Location Row */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{getCityName()}</span>
              </div>
              {getDistanceText() && (
                <span className="font-medium">{getDistanceText()}</span>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-gray-700">{place.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-gray-700">{place.totalSaves || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-gray-700">0</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={`h-12 rounded-xl flex flex-col gap-1 transition-all ${
                  isLiked(place.id)
                    ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                } ${isLiking ? 'animate-pulse' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isLiked(place.id) ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Like</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className={`h-12 rounded-xl flex flex-col gap-1 transition-all ${
                  isSaved(place.id)
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                } ${isSaving ? 'animate-pulse' : ''}`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved(place.id) ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Save</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="h-12 rounded-xl flex flex-col gap-1 text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Comment</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-12 rounded-xl flex flex-col gap-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all"
              >
                <Share2 className="w-4 h-4" />
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

export default LocationCard;
