import React from 'react';
import { MapPin } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCityEngagement } from '@/hooks/useCityEngagement';

interface CityEngagementCardProps {
  cityName: string;
  onClick: () => void;
  baseCount?: number;
}

const CityEngagementCard = ({ cityName, onClick, baseCount = 0 }: CityEngagementCardProps) => {
  const { engagement, loading } = useCityEngagement(cityName);

  const totalPins = engagement?.totalPins || baseCount;
  const followedUsers = engagement?.followedUsers || [];

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 bg-white hover:bg-gray-50 rounded-2xl transition-all border border-gray-100 shadow-md hover:shadow-lg"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-7 h-7 text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg text-gray-900 mb-1">
            {cityName}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{totalPins} pins</span>
            {followedUsers.length > 0 && (
              <span className="text-gray-400">•</span>
            )}
          </div>
        </div>

        {/* Profile pictures of followed users */}
        {followedUsers.length > 0 && (
          <div className="flex items-center -space-x-3 flex-shrink-0">
            {followedUsers.slice(0, 2).map((user) => (
              <Avatar key={user.id} className="w-9 h-9 border-2 border-white">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            ))}
            {followedUsers.length > 2 && (
              <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-700">
                  +{followedUsers.length - 2}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

export default CityEngagementCard;
