
import { Crown, Heart, Users, MapPin, Sparkles } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 mx-4 my-6 rounded-3xl p-6 shadow-lg border border-amber-200/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Crown className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Location of the Week
          </h2>
          <p className="text-sm text-gray-600">Most loved by your city</p>
        </div>
        <div className="ml-auto">
          <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
        </div>
      </div>

      {/* Location Card */}
      <div 
        className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-md hover:shadow-xl"
        onClick={() => onLocationClick(topLocation)}
      >
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
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
            {/* Crown badge */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">{topLocation.name}</h3>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 capitalize">{topLocation.category}</span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="text-sm font-semibold text-gray-700">{topLocation.likes} saves</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-700">{topLocation.visitors.length} visits</span>
              </div>
            </div>

            {/* Friends who saved */}
            {topLocation.friendsWhoSaved && topLocation.friendsWhoSaved.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex -space-x-2">
                  {topLocation.friendsWhoSaved.slice(0, 3).map((friend, index) => (
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
                <span className="text-xs text-gray-600">
                  {topLocation.friendsWhoSaved.length === 1 
                    ? `${topLocation.friendsWhoSaved[0].name} saved this`
                    : `+${topLocation.friendsWhoSaved.length} friends saved`
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          🎉 Join <span className="font-semibold text-yellow-600">{topLocation.likes + topLocation.visitors.length}</span> people who love this place!
        </p>
      </div>
    </div>
  );
};

export default LocationOfTheWeek;
