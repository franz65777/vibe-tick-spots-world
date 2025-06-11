import { useSavedPlaces } from '@/hooks/useSavedPlaces';
const TravelStats = () => {
  const {
    getStats,
    loading
  } = useSavedPlaces();
  const stats = getStats();
  if (loading) {
    return <div className="grid grid-cols-1 gap-4 mb-6 p-4 bg-gray-50 rounded-xl mx-4">
        <div className="text-center">
          <div className="text-2xl mb-1">🔍</div>
          <div className="text-lg font-bold text-gray-300 animate-pulse">-</div>
          <div className="text-xs text-gray-300 animate-pulse">Loading...</div>
        </div>
      </div>;
  }
  return;
};
export default TravelStats;