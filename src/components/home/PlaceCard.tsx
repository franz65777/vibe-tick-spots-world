
import React, { useState } from 'react';
import { Heart, MessageSquare, Users, MapPin, Share2, Building2, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlaceInteractionModal from './PlaceInteractionModal';
import { Place } from '@/types/place';
import { useMutedLocations } from '@/hooks/useMutedLocations';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const { mutedLocations, muteLocation, unmuteLocation, isMuting } = useMutedLocations(user?.id);
  const [interactionModal, setInteractionModal] = useState<{ isOpen: boolean; mode: 'comments' | 'share' }>({
    isOpen: false,
    mode: 'comments'
  });

  const isMuted = mutedLocations?.some((m: any) => m.location_id === place.id);

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

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      unmuteLocation(place.id);
    } else {
      muteLocation(place.id);
    }
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

  // Helper to get distance string
  const getDistanceString = () => {
    if (!place.distance) return null;
    if (typeof place.distance === 'string') return place.distance;
    return `${place.distance}km`;
  };

  // Helper to get image with fallback
  const getImageUrl = () => {
    return place.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop';
  };

  // Check if this is a business location
  const isBusinessLocation = () => {
    return typeof place.addedBy === 'object' && place.addedBy?.isFollowing === false;
  };

  return (
    <>
      <div 
        className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group"
        onClick={() => onCardClick(place)}
      >
        {/* Image section */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src={getImageUrl()} 
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          {/* Business badge - only if owned by business */}
          {isBusinessLocation() && (
            <div className="absolute top-3 right-3">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Business
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
              <span>{place.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
              </svg>
              <span>{getSavesCount()} saved</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span>{getVisitorCount()} visited</span>
            </div>
            {getDistanceString() && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18m-9-9l9 9-9 9"/>
                </svg>
                <span>{getDistanceString()}</span>
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
              <svg className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
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
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Button
              onClick={handleMuteToggle}
              variant="ghost"
              size="sm"
              disabled={isMuting}
              className={`flex-1 rounded-xl transition-all duration-200 ${
                isMuted 
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                  : 'text-gray-600 hover:bg-yellow-50 hover:text-yellow-600'
              }`}
            >
              {isMuted ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              {isMuted ? 'Muted' : 'Mute'}
            </Button>
          </div>

          {/* Added by section */}
          {place.addedBy && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Discovered by</span>
                <span className="font-medium text-gray-700">
                  {typeof place.addedBy === 'string' ? place.addedBy : place.addedBy.name}
                </span>
                {place.addedDate && (
                  <>
                    <span>•</span>
                    <span>{place.addedDate}</span>
                  </>
                )}
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
