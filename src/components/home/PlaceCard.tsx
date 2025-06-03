
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
        className="relative cursor-pointer hover:scale-[1.02] transition-all duration-300 group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md"
        onClick={() => onCardClick(place)}
      >
        {/* Image Container */}
        <div className="relative h-24 overflow-hidden">
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
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

          {place.isNew && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold z-10 shadow-sm">
              NEW
            </div>
          )}

          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={handleSaveToggle}
              className={`backdrop-blur-sm rounded-full p-1.5 shadow-sm transition-all duration-300 transform ${
                isSaved 
                  ? 'bg-blue-500 scale-110 shadow-lg wiggle' 
                  : 'bg-white/90 hover:bg-blue-50 hover:scale-110'
              }`}
            >
              <MapPin 
                className={`w-4 h-4 transition-all duration-300 ${
                  isSaved 
                    ? 'fill-white text-white bounce-pin' 
                    : 'text-blue-600'
                }`} 
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLikeToggle(place.id);
              }}
              className={`backdrop-blur-sm rounded-full p-1.5 shadow-sm transition-all duration-300 transform ${
                isLiked 
                  ? 'bg-red-50 scale-110 heartbeat' 
                  : 'bg-white/90 hover:scale-110 hover:bg-red-50'
              }`}
            >
              <Heart 
                className={`w-4 h-4 transition-all duration-300 ${
                  isLiked 
                    ? 'fill-red-500 text-red-500 pulse-heart' 
                    : 'text-gray-600'
                }`} 
              />
            </button>
          </div>

          {/* Total saves counter */}
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
            <MapPin className="w-3 h-3 text-white" />
            <span className="text-xs text-white font-medium">{totalSaves} saved</span>
          </div>

          {place.friendsWhoSaved && place.friendsWhoSaved.length > 0 && (
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
              <div className="flex -space-x-1">
                {place.friendsWhoSaved.slice(0, 2).map((friend, index) => (
                  <Avatar key={index} className="w-4 h-4 border border-white shadow-sm">
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
                {place.friendsWhoSaved.length} friends
              </span>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">{place.name}</h3>
              <p className="text-xs text-gray-600 capitalize">{place.category}</p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Heart className="w-3 h-3 text-red-500" />
              <span className="text-xs font-medium text-gray-700">{place.likes + (isLiked ? 1 : 0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(place);
              }}
              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg px-3 py-2 flex items-center justify-center gap-1 text-xs font-semibold transition-colors duration-200"
            >
              <Share className="w-3 h-3" />
              <span>Share</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComment(place);
              }}
              className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg px-3 py-2 flex items-center justify-center gap-1 text-xs font-semibold transition-colors duration-200"
            >
              <MessageCircle className="w-3 h-3" />
              <span>Comment</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-8deg); }
          60% { transform: rotate(8deg); }
        }
        
        @keyframes bounce-pin {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2) rotate(-5deg); }
          75% { transform: scale(1.1) rotate(5deg); }
        }
        
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          20% { transform: scale(1.15); }
          60% { transform: scale(1.1); }
        }
        
        @keyframes pulse-heart {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.2); }
          70% { transform: scale(1.1); }
        }
        
        .wiggle {
          animation: wiggle 0.6s ease-in-out;
        }
        
        .bounce-pin {
          animation: bounce-pin 0.6s ease-in-out;
        }
        
        .heartbeat {
          animation: heartbeat 0.8s ease-in-out;
        }
        
        .pulse-heart {
          animation: pulse-heart 0.8s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default PlaceCard;
