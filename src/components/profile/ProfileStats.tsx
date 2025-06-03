
import { useFollowStats } from '@/hooks/useFollowStats';

interface ProfileStatsProps {
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
}

const ProfileStats = ({ onFollowersClick, onFollowingClick, onPostsClick }: ProfileStatsProps) => {
  const { stats, loading } = useFollowStats();

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6 px-4">
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="text-center p-2">
            <div className="text-xl font-bold text-gray-300 animate-pulse">-</div>
            <div className="text-sm text-gray-300 animate-pulse">Loading...</div>
          </div>
        ))}
      </div>
    );
  }

  const statsData = [
    { label: 'Posts', value: stats.postsCount.toString(), onClick: onPostsClick },
    { label: 'Followers', value: stats.followersCount.toString(), onClick: onFollowersClick },
    { label: 'Following', value: stats.followingCount.toString(), onClick: onFollowingClick },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6 px-4">
      {statsData.map((stat, index) => (
        <button
          key={index}
          onClick={stat.onClick}
          className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors"
        >
          <div className="text-xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </button>
      ))}
    </div>
  );
};

export default ProfileStats;
