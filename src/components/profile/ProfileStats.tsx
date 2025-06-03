
import { useState } from 'react';
import { useFollowStats } from '@/hooks/useFollowStats';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { MapPin, Grid3X3, ChevronLeft, X } from 'lucide-react';

interface ProfileStatsProps {
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
}

interface SavedPlace {
  id: string;
  name: string;
  category: string;
  city: string;
  coordinates: { lat: number; lng: number };
  savedAt: string;
}

const ProfileStats = ({ onFollowersClick, onFollowingClick, onPostsClick }: ProfileStatsProps) => {
  const { stats: followStats, loading: followLoading } = useFollowStats();
  const { getStats, savedPlaces, loading: placesLoading } = useSavedPlaces();
  const placesStats = getStats();
  const [view, setView] = useState<'stats' | 'cities' | 'places'>('stats');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  if (followLoading || placesLoading) {
    return (
      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="text-center">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statsData = [
    { 
      label: 'followers', 
      value: '1.5K', // Format large numbers
      onClick: onFollowersClick
    },
    { 
      label: 'following', 
      value: followStats.followingCount.toString(), 
      onClick: onFollowingClick
    },
    { 
      label: 'posts', 
      value: followStats.postsCount.toString(), 
      onClick: onPostsClick
    },
    { 
      label: `${placesStats.places} places`, 
      value: `${placesStats.cities} cities`, 
      onClick: () => setView('cities')
    },
  ];

  const renderCityCard = (city: string, places: SavedPlace[]) => (
    <div 
      key={city}
      onClick={() => {
        setSelectedCity(city);
        setView('places');
      }}
      className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-blue-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{city}</h3>
          <p className="text-sm text-gray-600">{places.length} places saved</p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-md">
          <MapPin className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const renderPlaceCard = (place: SavedPlace) => (
    <div key={place.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{place.name}</h3>
          <p className="text-sm text-gray-600 capitalize">{place.category}</p>
          <p className="text-xs text-gray-500">Saved on {new Date(place.savedAt).toLocaleDateString()}</p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-md">
          <span className="text-white text-sm font-bold">{place.category[0].toUpperCase()}</span>
        </div>
      </div>
    </div>
  );

  if (view === 'cities') {
    return (
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => setView('stats')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Your Cities</h2>
        </div>
        <div className="space-y-4">
          {Object.entries(savedPlaces).map(([city, places]) => 
            renderCityCard(city, places)
          )}
        </div>
      </div>
    );
  }

  if (view === 'places' && selectedCity) {
    const cityPlaces = savedPlaces[selectedCity] || [];
    return (
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => setView('cities')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">{selectedCity}</h2>
          <button 
            onClick={() => setView('stats')}
            className="ml-auto p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="space-y-4">
          {cityPlaces.map(place => renderPlaceCard(place))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-4">
          {statsData.map((stat, index) => (
            <button
              key={index}
              onClick={stat.onClick}
              className={`text-center py-6 px-3 hover:bg-gray-50 transition-colors ${
                index < statsData.length - 1 ? 'border-r border-gray-100' : ''
              }`}
            >
              <div className="text-xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-xs text-gray-600 font-medium">{stat.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileStats;
