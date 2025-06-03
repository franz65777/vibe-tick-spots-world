
import { useState } from 'react';
import { useFollowStats } from '@/hooks/useFollowStats';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { MapPin, Grid3X3, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((_, index) => (
            <div key={index} className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-lg font-bold text-gray-300 animate-pulse">-</div>
              <div className="text-xs text-gray-300 animate-pulse">Loading...</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statsData = [
    { label: 'Posts', value: followStats.postsCount.toString(), onClick: onPostsClick, icon: Grid3X3 },
    { label: 'Followers', value: followStats.followersCount.toString(), onClick: onFollowersClick },
    { label: 'Following', value: followStats.followingCount.toString(), onClick: onFollowingClick },
    { 
      label: 'Locations', 
      value: placesStats.cities.toString(), 
      onClick: () => setView('cities'),
      icon: MapPin,
      subtitle: `${placesStats.places} places`
    },
  ];

  const renderCityCard = (city: string, places: SavedPlace[]) => (
    <div 
      key={city}
      onClick={() => {
        setSelectedCity(city);
        setView('places');
      }}
      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{city}</h3>
          <p className="text-sm text-gray-600">{places.length} places saved</p>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <MapPin className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    </div>
  );

  const renderPlaceCard = (place: SavedPlace) => (
    <div key={place.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{place.name}</h3>
          <p className="text-sm text-gray-600 capitalize">{place.category}</p>
          <p className="text-xs text-gray-500">Saved on {new Date(place.savedAt).toLocaleDateString()}</p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">{place.category[0].toUpperCase()}</span>
        </div>
      </div>
    </div>
  );

  if (view === 'cities') {
    return (
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setView('stats')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Your Cities</h2>
        </div>
        <div className="space-y-3">
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
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setView('cities')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{selectedCity}</h2>
          <button 
            onClick={() => setView('stats')}
            className="ml-auto p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="space-y-3">
          {cityPlaces.map(place => renderPlaceCard(place))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6">
      <div className="grid grid-cols-4 gap-2">
        {statsData.map((stat, index) => (
          <button
            key={index}
            onClick={stat.onClick}
            className="text-center hover:bg-gray-50 rounded-xl p-3 transition-all duration-200 hover:scale-105 bg-white shadow-sm border border-gray-100"
          >
            <div className="flex flex-col items-center gap-1">
              {stat.icon && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                  <stat.icon className="w-4 h-4 text-blue-600" />
                </div>
              )}
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
              {stat.subtitle && (
                <div className="text-xs text-gray-500">{stat.subtitle}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileStats;
