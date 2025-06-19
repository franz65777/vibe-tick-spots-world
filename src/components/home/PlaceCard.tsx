
import React, { useState } from 'react';
import { Heart, MessageSquare, Users, MapPin, Share2, Building2, Star, Navigation, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlaceInteractionModal from './PlaceInteractionModal';
import { Place } from '@/types/place';

interface PlaceCardProps {
  place: Place;
  isLiked: boolean;
  isSaved: boolean;
  onCardClick: (place: Place) => void;
  onLikeToggle: (placeId: string) => void;
  onSaveToggle: (place: Place) => void;
  onShare: (place: Place) => void;
  onComment: (place: Place) => void;
  cityName: string;
  userLocation?: { latitude: number; longitude: number } | null;
}

const PlaceCard = ({ 
  place, 
  isLiked, 
  isSaved, 
  onCardClick, 
  onLikeToggle, 
  onSaveToggle, 
  onShare, 
  onComment, 
  cityName,
  userLocation 
}: PlaceCardProps) => {
  const [interactionModal, setInteractionModal] = useState<{ isOpen: boolean; mode: 'comments' | 'share' }>({
    isOpen: false,
    mode: 'comments'
  });

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInteractionModal({ isOpen: true, mode: 'comments' });
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(place);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle(place.id);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveToggle(place);
  };

  // Helper functions
  const getVisitorCount = () => {
    if (typeof place.visitors === 'number') return place.visitors;
    return place.visitors?.length || 0;
  };

  const getSavesCount = () => {
    if (place.totalSaves) return place.totalSaves;
    if (typeof place.friendsWhoSaved === 'number') return place.friendsWhoSaved;
    return place.friendsWhoSaved?.length || 0;
  };

  const getDistanceString = () => {
    if (!place.distance) return null;
    if (typeof place.distance === 'string') return place.distance;
    return `${place.distance}km`;
  };

  const getImageUrl = () => {
    return place.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop';
  };

  const isBusinessLocation = () => {
    return typeof place.addedBy === 'object' && place.addedBy?.isFollowing === false;
  };

  return (
    <>
      <div 
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
        onClick={() => onCardClick(place)}
      >
        {/* Image section */}
        <div className="relative">
          <div className="aspect-[16/10] overflow-hidden cursor-pointer">
            <img 
              src={getImageUrl()} 
              alt={place.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          
          {/* Overlay content */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          {/* Top badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 capitalize shadow-sm">
              {place.category}
            </div>
            {place.isNew && (
              <div className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                New
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={handleSaveClick}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 ${
                isSaved 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white/95 backdrop-blur-sm text-gray-600 hover:bg-white'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content section */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-xl text-gray-900 mb-2 leading-tight">
              {place.name}
            </h3>
            <div className="flex items-center gap-1 text-gray-500 mb-3">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{cityName}</span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="font-medium">{place.likes}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Bookmark className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{getSavesCount()}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-medium">{getVisitorCount()}</span>
              </div>
              
              {getDistanceString() && (
                <div className="flex items-center gap-1">
                  <Navigation className="w-4 h-4 text-green-400" />
                  <span className="font-medium">{getDistanceString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLikeClick}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                isLiked 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Liked' : 'Like'}
            </button>
            
            <button
              onClick={handleCommentClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
            >
              <MessageSquare className="w-4 h-4" />
              Comment
            </button>
            
            <button
              onClick={handleShareClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      <PlaceInteractionModal
        isOpen={interactionModal.isOpen}
        onClose={() => setInteractionModal({ isOpen: false, mode: 'comments' })}
        place={place}
        mode={interactionModal.mode}
      />
    </>
  );
};

export default PlaceCard;
