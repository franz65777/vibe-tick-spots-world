
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
      className="relative cursor-pointer hover:scale-[1.02] transition-all duration-300 group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl"
      onClick={() => onCardClick(place)}
    >
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

        {/* NEW Badge */}
        {place.isNew && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold z-10 shadow-lg">
            NEW
          </div>
        )}

        {/* Like button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle(place.id);
            }}
            className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Heart 
              className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'} transition-colors duration-200`} 
            />
          </button>
        </div>

        {/* Friends who saved */}
        {place.friendsWhoSaved && place.friendsWhoSaved.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2 shadow-lg">
            <div className="flex -space-x-1">
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
      </div>

      {/* Content Container */}
      <div className="p-4 space-y-4">
        {/* Location Info */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{place.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{place.category}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-700">{place.likes + (isLiked ? 1 : 0)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(place);
            }}
            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200"
          >
            <Share className="w-4 h-4" />
            <span>Share</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment(place);
            }}
            className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
