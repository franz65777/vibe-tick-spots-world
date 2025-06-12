
import { useProfile } from '@/hooks/useProfile';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { cn } from '@/lib/utils';

interface ProfileStatsProps {
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
  onLocationsClick: () => void;
}

const ProfileStats = ({ onFollowersClick, onFollowingClick, onPostsClick, onLocationsClick }: ProfileStatsProps) => {
  const { profile } = useProfile();
  const { getStats, loading } = useSavedPlaces();
  const savedStats = getStats();

  const statsData = [
    {
      label: 'Posts',
      value: profile?.posts_count || 0,
      onClick: onPostsClick,
      color: 'text-blue-600'
    },
    {
      label: 'Followers',
      value: profile?.followers_count || 1542,
      onClick: onFollowersClick,
      color: 'text-purple-600'
    },
    {
      label: 'Following',
      value: profile?.following_count || 892,
      onClick: onFollowingClick,
      color: 'text-green-600'
    },
    {
      label: 'Locations',
      value: loading ? '-' : savedStats.places,
      onClick: onLocationsClick,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="bg-white px-6 py-4 border-b border-gray-100">
      <div className="grid grid-cols-4 gap-1">
        {statsData.map((stat, index) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className={cn(
              "text-center py-3 px-2 transition-colors rounded-lg",
              "hover:bg-gray-50 active:bg-gray-100"
            )}
          >
            <div className={cn("text-lg font-bold mb-1", stat.color)}>
              {typeof stat.value === 'number' && stat.value > 999 
                ? `${(stat.value / 1000).toFixed(1)}K`
                : stat.value
              }
            </div>
            <div className="text-xs text-gray-600 leading-tight">
              {stat.label}
            </div>
            {stat.label === 'Locations' && !loading && (
              <div className="text-xs text-gray-500 mt-1">
                saved
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileStats;
