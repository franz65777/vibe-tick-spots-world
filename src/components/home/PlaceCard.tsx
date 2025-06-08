
import React, { useState } from 'react';
import { Heart, MessageSquare, Users, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlaceInteractionModal from './PlaceInteractionModal';

interface PlaceCardProps {
  place: {
    id: string;
    name: string;
    category: string;
    likes: number;
    friendsWhoSaved?: { name: string; avatar: string }[] | number;
    visitors: string[] | number;
    isNew: boolean;
    coordinates: { lat: number; lng: number };
    image: string;
    addedBy?: {
      name: string;
      avatar: string;
      isFollowing: boolean;
    };
    addedDate: string;
    isFollowing?: boolean;
    popularity?: number;
    distance?: string;
    totalSaves?: number;
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
  const [isSaved, setIsSaved] = useState(false);

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

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
  };

  // Helper to get visitor count
  const getVisitorCount = () => {
    if (typeof place.visitors === 'number') return place.visitors;
    return place.visitors?.length || 0;
  };

  // Helper to get saves count
  const getSavesCount = () => {
    if (place.totalSaves) return place.totalSaves;
    if (typeof place.friendsWhoSaved === 'number') return place.friendsWhoSaved;
    return place.friendsWhoSaved?.length || 0;
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
          
          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
              <Compass className="w-3 h-3 text-blue-500" />
              {place.category}
            </div>
          </div>

          {/* Explorer badge */}
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
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span className="text-sm">{cityName}</span>
              </div>
            </div>
          </div>

          {/* Stats with travel-inspired icons */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-400" />
              <span>{place.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>{getSavesCount()} saved</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span>{getVisitorCount()} visited</span>
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
              Like
            </Button>

            <Button
              onClick={handleSaveClick}
              variant="ghost"
              size="sm"
              className={`flex-1 rounded-xl transition-all duration-200 ${
                isSaved 
                  ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' 
                  : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              <svg className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
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
              className="flex-1 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1.5-2s-1.5.62-1.5 2a2.5 2.5 0 0 0 2.5 2.5z"/>
                <path d="M12 6V4a2 2 0 0 1 4 0v2"/>
                <path d="M3 11v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/>
                <path d="M12 16v2a2 2 0 0 1-4 0v-2"/>
              </svg>
              Suggest
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
