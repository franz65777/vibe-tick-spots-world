
import { Heart, Users, MapPin, Sparkles } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved?: { name: string; avatar: string }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  image?: string;
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
}

interface LocationOfTheWeekProps {
  topLocation: Place;
  onLocationClick: (place: Place) => void;
}

const LocationOfTheWeek = ({ topLocation, onLocationClick }: LocationOfTheWeekProps) => {
  return (
    <div className="mx-4 my-2">
      <div 
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-md hover:shadow-lg border border-amber-200/50"
        onClick={() => onLocationClick(topLocation)}
      >
        <div className="flex items-center gap-3">
          {/* Trophy Icon - More Minimal */}
          <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center border border-amber-200/50">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Location Image */}
          <div className="relative">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
              {topLocation.image ? (
                <img
                  src={topLocation.image}
                  alt={topLocation.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500"></div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-sm truncate">{topLocation.name}</h3>
              <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="font-medium">{topLocation.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-500" />
                <span className="font-medium">{topLocation.visitors.length}</span>
              </div>
              <span className="text-yellow-600 font-medium">Location of the Week</span>
            </div>
          </div>

          {/* Friends who saved (compact) */}
          {topLocation.friendsWhoSaved && topLocation.friendsWhoSaved.length > 0 && (
            <div className="flex -space-x-1">
              {topLocation.friendsWhoSaved.slice(0, 2).map((friend, index) => (
                <Avatar key={index} className="w-6 h-6 border-2 border-white shadow-sm">
                  <AvatarImage 
                    src={`https://images.unsplash.com/photo-${friend.avatar}?w=32&h=32&fit=crop&crop=face`} 
                    alt={friend.name}
                  />
                  <AvatarFallback className="text-xs">
                    {friend.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationOfTheWeek;
