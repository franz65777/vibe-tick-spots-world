import React, { useState } from 'react';
import { Heart, MessageSquare, Share2, MapPin, Users, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlaceInteractionModal from './PlaceInteractionModal';

interface PlaceCardProps {
  place: {
    id: string;
    name: string;
    category: string;
    likes: number;
    friendsWhoSaved: number;
    visitors: number;
    isNew: boolean;
    coordinates: { lat: number; lng: number };
    image: string;
    addedBy?: {
      name: string;
      avatar: string;
      isFollowing: boolean;
    };
    addedDate: string;
    isFollowing: boolean;
    popularity: number;
    distance?: string;
    totalSaves: number;
  };
  isLiked: boolean;
  onCardClick: () => void;
  onLikeToggle: () => void;
  onShare: () => void;
  onComment: () => void;
  cityName: string;
}

const PlaceCard = ({ place, isLiked, onCardClick, onLikeToggle, onShare, onComment, cityName }: PlaceCardProps) => {
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
    setInteractionModal({ isOpen: true, mode: 'share' });
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle();
  };

  return (
    <>
      <div 
        className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group"
        onClick={onCardClick}
      >
        {/* Image section */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src={place.image} 
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          {/* Category badge with travel-inspired design */}
          <div className="absolute top-3 left-3">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
              <Compass className="w-3 h-3 text-blue-500" />
              {place.category}
            </div>
          </div>

          {/* Pioneer badge */}
          {place.addedBy?.isFollowing && (
            <div className="absolute top-3 right-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Users className="w-3 h-3" />
                Explorer
              </div>
            </div>
          )}
        </div>

        {/* Content section */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{place.name}</h3>
              <div className="flex items-center gap-1 text-gray-500 mt-1">
                <MapPin className="w-3 h-3" />
                <span className="text-sm">{cityName}</span>
              </div>
            </div>
          </div>

          {/* Stats with travel-inspired icons */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-400" />
              <span>{place.totalSaves}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span>{place.visitors} visited</span>
            </div>
            {place.distance && (
              <div className="flex items-center gap-1">
                <Compass className="w-4 h-4 text-green-400" />
                <span>{place.distance}</span>
              </div>
            )}
          </div>

          {/* Action buttons with unique travel-inspired design */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleLikeClick}
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-xl transition-all duration-200 ${
                isLiked 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              Save
            </Button>

            <Button
              onClick={handleCommentClick}
              variant="ghost"
              size="sm"
              className="flex-1 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Stories
            </Button>

            <Button
              onClick={handleShareClick}
              variant="ghost"
              size="sm"
              className="flex-1 rounded-xl text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-all duration-200"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Added by section */}
          {place.addedBy && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Discovered by</span>
                <span className="font-medium text-gray-700">{place.addedBy.name}</span>
                <span>•</span>
                <span>{place.addedDate}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <PlaceInteractionModal
        isOpen={interactionModal.isOpen}
        onClose={() => setInteractionModal({ isOpen: false, mode: 'comments' })}
        mode={interactionModal.mode}
        place={place}
      />
    </>
  );
};

export default PlaceCard;
