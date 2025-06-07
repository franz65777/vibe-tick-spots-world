
import { useBadges } from '@/hooks/useBadges';
import { Badge } from '@/components/ui/badge';

const Achievements = () => {
  const { userBadges, allBadges } = useBadges();

  const getBadgeStats = () => {
    return {
      earned: userBadges.length,
      total: allBadges.length,
      recentBadge: userBadges[0] || null
    };
  };

  const stats = getBadgeStats();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.earned}</div>
          <div className="text-sm text-gray-600">Badges Earned</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400">{stats.total - stats.earned}</div>
          <div className="text-sm text-gray-600">To Unlock</div>
        </div>
      </div>

      {stats.recentBadge && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Latest Achievement</h4>
          <div className="flex items-center gap-3">
            <div className="text-2xl">{stats.recentBadge.icon}</div>
            <div>
              <div className="font-medium">{stats.recentBadge.name}</div>
              <div className="text-sm text-gray-600">{stats.recentBadge.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;
