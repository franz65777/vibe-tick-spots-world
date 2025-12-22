
import { useSavedPlaces } from '@/hooks/useSavedPlaces';

const TravelStats = () => {
  const { getStats, loading } = useSavedPlaces();
  const stats = getStats();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl mx-4">
        {[1, 2].map((_, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl mb-1">📍</div>
            <div className="text-lg font-bold text-gray-300 animate-pulse">-</div>
            <div className="text-xs text-gray-300 animate-pulse">Loading...</div>
          </div>
        ))}
      </div>
    );
  }

  const travelStats = [
    { label: 'Cities', value: stats.cities.toString(), icon: '📍' },
    { label: 'Places', value: stats.places.toString(), icon: '🔍' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl mx-4">
      {travelStats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-2xl mb-1">{stat.icon}</div>
          <div className="text-lg font-bold text-gray-900">{stat.value}</div>
          <div className="text-xs text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default TravelStats;
