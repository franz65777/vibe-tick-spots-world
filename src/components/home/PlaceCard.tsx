
import { Heart, Share, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
      className="relative cursor-pointer hover:scale-[1.02] transition-all duration-300 group"
      onClick={() => onCardClick(place)}
    >
      {place.isNew && (
        <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold z-10 shadow-lg animate-pulse">
          NEW
        </div>
      )}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl h-40 relative overflow-hidden shadow-xl group-hover:shadow-2xl transition-shadow duration-300">
        {place.image ? (
          <img
            src={place.image}
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.setAttribute('style', 'display: block');
            }}
          />
        ) : null}
        <div className={`absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 opacity-60 ${place.image ? 'hidden' : ''}`}></div>
        
        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

        {/* Like button and count - top right */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle(place.id);
            }}
            className="bg-white/95 backdrop-blur-lg rounded-2xl px-4 py-2 flex items-center gap-2 text-sm font-semibold shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Heart 
              className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'} transition-colors duration-200`} 
            />
            <span className="text-gray-800">{place.likes + (isLiked ? 1 : 0)}</span>
          </button>
        </div>

        {/* Friends who saved - top left under NEW badge */}
        {place.friendsWhoSaved && place.friendsWhoSaved.length > 0 && (
          <div className="absolute top-12 left-3 bg-white/95 backdrop-blur-lg rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg">
            <div className="flex -space-x-2">
              {place.friendsWhoSaved.slice(0, 2).map((friend, index) => (
                <Avatar key={index} className="w-5 h-5 border-2 border-white shadow-sm">
                  <AvatarImage 
                    src={`https://images.unsplash.com/photo-${friend.avatar}?w=32&h=32&fit=crop&crop=face`} 
                    alt={friend.name}
                  />
                  <AvatarFallback className="text-xs font-medium">
                    {friend.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-gray-700 font-medium">
              {place.friendsWhoSaved.length === 1 
                ? `${place.friendsWhoSaved[0].name} saved`
                : `${place.friendsWhoSaved.length} friends saved`
              }
            </span>
          </div>
        )}

        {/* Location name - bottom left */}
        <div className="absolute bottom-16 left-4 text-white">
          <h3 className="text-lg font-bold drop-shadow-lg">{place.name}</h3>
          <p className="text-sm text-white/90 capitalize drop-shadow-md">{place.category}</p>
        </div>

        {/* Share and Comment buttons - bottom */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(place);
            }}
            className="bg-white/95 backdrop-blur-lg rounded-2xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold shadow-lg hover:scale-105 transition-all duration-200 flex-1"
          >
            <Share className="w-4 h-4 text-blue-600" />
            <span className="text-gray-800">Share</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment(place);
            }}
            className="bg-white/95 backdrop-blur-lg rounded-2xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold shadow-lg hover:scale-105 transition-all duration-200 flex-1"
          >
            <MessageCircle className="w-4 h-4 text-purple-600" />
            <span className="text-gray-800">Comment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
