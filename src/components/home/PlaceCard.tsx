
import { Heart, Share, MessageCircle } from 'lucide-react';

interface Friend {
  name: string;
  avatar: string;
}

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: Friend[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
}

interface PlaceCardProps {
  place: Place;
  isLiked: boolean;
  onCardClick: (place: Place) => void;
  onLikeToggle: (placeId: string) => void;
  onShare: (place: Place) => void;
  onComment: (place: Place) => void;
}

const PlaceCard = ({ place, isLiked, onCardClick, onLikeToggle, onShare, onComment }: PlaceCardProps) => {
  return (
    <div 
      className="relative cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => onCardClick(place)}
    >
      {place.isNew && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
          NEW
        </div>
      )}
      <div className="bg-gray-100 rounded-xl h-32 relative overflow-hidden">
        {place.image ? (
          <img
            src={place.image}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.setAttribute('style', 'display: block');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-50 ${place.image ? 'hidden' : ''}`}></div>
        
        {/* Like button and count - top right */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle(place.id);
            }}
            className="bg-white/90 backdrop-blur-sm rounded-full p-2 flex items-center gap-1 text-xs font-medium shadow-sm"
          >
            <Heart 
              className={`w-3 h-3 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
            />
            <span className="text-gray-800">{place.likes + (isLiked ? 1 : 0)}</span>
          </button>
        </div>

        {/* Friends who saved - top left under NEW badge */}
        {place.friendsWhoSaved && place.friendsWhoSaved.length > 0 && (
          <div className="absolute top-8 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
            <div className="flex -space-x-1">
              {place.friendsWhoSaved.slice(0, 2).map((friend, index) => (
                <div key={index} className="w-4 h-4 rounded-full bg-gray-300 border border-white flex items-center justify-center">
                  <span className="text-xs font-medium">{friend.name[0]}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-700">
              {place.friendsWhoSaved.length === 1 
                ? `${place.friendsWhoSaved[0].name} saved`
                : `${place.friendsWhoSaved.length} friends saved`
              }
            </span>
          </div>
        )}

        {/* Location name - bottom left */}
        <div className="absolute bottom-12 left-2 text-white text-sm font-medium">
          {place.name}
        </div>

        {/* Share and Comment buttons - bottom */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(place);
            }}
            className="bg-white/90 backdrop-blur-sm rounded-full p-2 flex items-center gap-1 text-xs font-medium shadow-sm"
          >
            <Share className="w-3 h-3 text-gray-600" />
            <span className="text-gray-800">Share</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment(place);
            }}
            className="bg-white/90 backdrop-blur-sm rounded-full p-2 flex items-center gap-1 text-xs font-medium shadow-sm"
          >
            <MessageCircle className="w-3 h-3 text-gray-600" />
            <span className="text-gray-800">Comment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
