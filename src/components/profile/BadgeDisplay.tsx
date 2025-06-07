
import { useBadges } from '@/hooks/useBadges';

const BadgeDisplay = () => {
  const { userBadges } = useBadges();

  const getTopBadges = () => {
    return userBadges.slice(0, 3);
  };

  const topBadges = getTopBadges();

  if (topBadges.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No badges earned yet</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2">
      {topBadges.map((badge) => (
        <div 
          key={badge.id}
          className="flex flex-col items-center gap-1"
          title={badge.description}
        >
          <div className="text-2xl">{badge.icon}</div>
          <span className="text-xs text-gray-600 text-center">{badge.name}</span>
        </div>
      ))}
    </div>
  );
};

export default BadgeDisplay;
