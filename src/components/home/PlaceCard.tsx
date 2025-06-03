import { Heart, Share, MessageCircle, MapPin } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';

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
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
  totalSaves?: number;
}

interface PlaceCardProps {
  place: Place;
  isLiked: boolean;
  onCardClick: (place: Place) => void;
  onLikeToggle: (placeId: string) => void;
  onShare: (place: Place) => void;
  onComment: (place: Place) => void;
  cityName?: string;
}

const PlaceCard = ({ place, isLiked, onCardClick, onLikeToggle, onShare, onComment, cityName = 'San Francisco' }: PlaceCardProps) => {
  const { savePlace, unsavePlace, isPlaceSaved } = useSavedPlaces();
  const isSaved = isPlaceSaved(place.id);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isSaved) {
      unsavePlace(place.id, cityName);
    } else {
      savePlace({
        id: place.id,
        name: place.name,
        category: place.category,
        city: cityName,
        coordinates: place.coordinates
      });
    }
  };

  // Calculate total saves (demo data + actual saves)
  const totalSaves = (place.totalSaves || 23) + (isSaved ? 1 : 0);

  return (
    <>
      <div 
        className="relative cursor-pointer hover:scale-[1.03] transition-all duration-300 group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl border border-gray-100"
        onClick={() => onCardClick(place)}
      >
        {/* Image Container */}
        <div className="relative h-32 sm:h-28 overflow-hidden">
          {place.image ? (
            <img
              src={place.image}
              alt={place.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.setAttribute('style', 'display: block');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 opacity-80 ${place.image ? 'hidden' : ''}`}></div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

          {place.isNew && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs px-3 py-1.5 rounded-full font-bold z-10 shadow-lg animate-pulse">
              NEW
            </div>
          )}

          <div className="absolute top-3 right-3 flex gap-3 sm:gap-2">
            <button
              onClick={handleSaveToggle}
              className={`backdrop-blur-md rounded-full p-3 sm:p-2 shadow-lg transition-all duration-300 transform min-w-[48px] min-h-[48px] sm:min-w-[40px] sm:min-h-[40px] ${
                isSaved 
                  ? 'bg-blue-500 scale-110 shadow-xl wiggle-animation' 
                  : 'bg-white/95 hover:bg-blue-50 hover:scale-110'
              }`}
            >
              <MapPin 
                className={`w-5 h-5 sm:w-4 sm:h-4 transition-all duration-300 ${
                  isSaved 
                    ? 'fill-white text-white bounce-animation' 
                    : 'text-blue-600'
                }`} 
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLikeToggle(place.id);
              }}
              className={`backdrop-blur-md rounded-full p-3 sm:p-2 shadow-lg transition-all duration-300 transform min-w-[48px] min-h-[48px] sm:min-w-[40px] sm:min-h-[40px] ${
                isLiked 
                  ? 'bg-red-50 scale-110 heartbeat-animation' 
                  : 'bg-white/95 hover:scale-110 hover:bg-red-50'
              }`}
            >
              <Heart 
                className={`w-5 h-5 sm:w-4 sm:h-4 transition-all duration-300 ${
                  isLiked 
                    ? 'fill-red-500 text-red-500 pulse-animation' 
                    : 'text-gray-600'
                }`} 
              />
            </button>
          </div>

          {/* Total saves counter */}
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md rounded-full px-4 py-2 sm:px-3 sm:py-1.5 flex items-center gap-2 sm:gap-1.5 shadow-lg">
            <MapPin className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
            <span className="text-sm sm:text-xs text-white font-bold">{totalSaves} saved</span>
          </div>

          {place.friendsWhoSaved && place.friendsWhoSaved.length > 0 && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 sm:px-3 sm:py-1.5 flex items-center gap-2 sm:gap-1.5 shadow-lg">
              <div className="flex -space-x-1">
                {place.friendsWhoSaved.slice(0, 2).map((friend, index) => (
                  <Avatar key={index} className="w-5 h-5 sm:w-4 sm:h-4 border border-white shadow-sm">
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
              <span className="text-sm sm:text-xs text-gray-700 font-semibold">
                {place.friendsWhoSaved.length} friends
              </span>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="p-5 sm:p-4 space-y-4 sm:space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-sm font-bold text-gray-900 truncate">{place.name}</h3>
              <p className="text-base sm:text-xs text-gray-600 capitalize">{place.category}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-1.5 ml-2">
              <Heart className="w-4 h-4 sm:w-3 sm:h-3 text-red-500" />
              <span className="text-sm sm:text-xs font-bold text-gray-700">{place.likes + (isLiked ? 1 : 0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(place);
              }}
              className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-600 rounded-xl px-4 py-3 sm:px-3 sm:py-2.5 flex items-center justify-center gap-2 sm:gap-1.5 text-base sm:text-xs font-bold transition-all duration-300 hover:scale-105 shadow-sm min-h-[48px] sm:min-h-[44px]"
            >
              <Share className="w-4 h-4 sm:w-3 sm:h-3" />
              <span>Share</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComment(place);
              }}
              className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 rounded-xl px-4 py-3 sm:px-3 sm:py-2.5 flex items-center justify-center gap-2 sm:gap-1.5 text-base sm:text-xs font-bold transition-all duration-300 hover:scale-105 shadow-sm min-h-[48px] sm:min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 sm:w-3 sm:h-3" />
              <span>Comment</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg) scale(1.1); }
          25% { transform: rotate(-3deg) scale(1.15); }
          75% { transform: rotate(3deg) scale(1.15); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: scale(1.1); }
          50% { transform: scale(1.25); }
        }
        
        @keyframes heartbeat {
          0%, 100% { transform: scale(1.1); }
          50% { transform: scale(1.2); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .wiggle-animation {
          animation: wiggle 0.6s ease-in-out;
        }
        
        .bounce-animation {
          animation: bounce 0.6s ease-in-out;
        }
        
        .heartbeat-animation {
          animation: heartbeat 0.8s ease-in-out;
        }
        
        .pulse-animation {
          animation: pulse 0.8s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default PlaceCard;
