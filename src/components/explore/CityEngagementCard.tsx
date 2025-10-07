import React from 'react';
import { MapPin } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCityEngagement } from '@/hooks/useCityEngagement';

interface CityEngagementCardProps {
  cityName: string;
  onClick: () => void;
  baseCount?: number;
  coords?: { lat: number; lng: number };
}

const CityEngagementCard = ({ cityName, onClick, baseCount = 0, coords }: CityEngagementCardProps) => {
  const { engagement, loading } = useCityEngagement(cityName, coords);

  // Always prefer live engagement data; do not cap or fallback to static counts
  const totalPins = typeof engagement?.totalPins === 'number' ? engagement.totalPins : 0;
  const followedUsers = engagement?.followedUsers || [];

  console.log(`🏙️ ${cityName} - Pins: ${totalPins}, Followed users:`, followedUsers.length, coords ? `@ ${coords.lat},${coords.lng}` : '');

  const displayCount = `${totalPins}`;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-full transition-all border border-gray-200 shadow-sm hover:shadow-md min-w-0"
    >
      <span className="font-semibold text-gray-900 truncate">{cityName}</span>

      {totalPins > 0 && (
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          <MapPin className="w-3 h-3" />
          {displayCount}
        </span>
      )}

      {followedUsers.length > 0 && (
        <div className="flex items-center -space-x-2 shrink-0">
          {followedUsers.slice(0, 2).map((user) => (
            <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-[10px]">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ))}
          {followedUsers.length > 2 && (
            <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
              <span className="text-[10px] font-semibold text-gray-700">
                +{followedUsers.length - 2}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  );
};

export default CityEngagementCard;
