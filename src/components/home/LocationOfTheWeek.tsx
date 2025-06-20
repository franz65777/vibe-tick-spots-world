
import React from 'react';
import { MapPin, Heart, Users, Star, Award } from 'lucide-react';
import { Place } from '@/types/place';

interface LocationOfTheWeekProps {
  topLocation: any;
  onLocationClick: (place: Place) => void;
  currentCity: string;
}

const LocationOfTheWeek = ({ topLocation, onLocationClick, currentCity }: LocationOfTheWeekProps) => {
  if (!topLocation) return null;

  // Get current week number for rotation
  const getWeekNumber = (date: Date) => {
    const onejan = new Date(date.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    return Math.ceil((((date.getTime() - onejan.getTime()) / millisecsInDay) + onejan.getDay() + 1) / 7);
  };

  const currentWeek = getWeekNumber(new Date());

  // Convert to proper Place format for the click handler
  const convertToPlace = (location: any): Place => ({
    id: location.id,
    name: location.name,
    category: location.category,
    likes: location.likes,
    friendsWhoSaved: Array.isArray(location.friendsWhoSaved) ? location.friendsWhoSaved : [],
    visitors: Array.isArray(location.visitors) ? location.visitors : [],
    isNew: location.isNew || false,
    coordinates: location.coordinates,
    image: location.image,
    addedBy: location.addedBy,
    addedDate: location.addedDate,
    isFollowing: location.isFollowing,
    popularity: location.popularity,
    totalSaves: location.totalSaves
  });

  const handleClick = () => {
    onLocationClick(convertToPlace(topLocation));
  };

  // Get visitor count
  const getVisitorCount = () => {
    if (typeof topLocation.visitors === 'number') return topLocation.visitors;
    return Array.isArray(topLocation.visitors) ? topLocation.visitors.length : 0;
  };

  return (
    <div className="mx-4 mb-4">
      <div 
        className="relative bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 rounded-3xl p-4 border border-amber-200/50 cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
        onClick={handleClick}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 to-orange-100/20 rounded-3xl"></div>
        
        {/* Award Badge */}
        <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-2 shadow-lg">
          <Award className="w-4 h-4 text-white" />
        </div>

        {/* Week Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
          <span className="text-xs font-bold text-amber-600">Week {currentWeek}</span>
        </div>

        <div className="relative flex items-center gap-4 mt-8">
          {/* Location Image */}
          <div className="relative">
            <img 
              src={topLocation.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'} 
              alt={topLocation.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-lg ring-2 ring-white"
            />
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-1.5 shadow-lg">
              <Star className="w-3 h-3 text-white fill-current" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-lg sm:text-xl truncate">{topLocation.name}</h3>
                </div>
                <div className="flex items-center gap-1 text-amber-600 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="text-sm font-medium">{currentCity}</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">
                <Star className="w-4 h-4 fill-current" />
                <span>Location of the Week</span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                <Heart className="w-4 h-4 text-red-500 fill-current" />
                <span className="font-semibold text-gray-800">{topLocation.likes}</span>
                <span className="text-gray-600">likes</span>
              </div>
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-gray-800">{getVisitorCount()}</span>
                <span className="text-gray-600">visits</span>
              </div>
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600 font-medium capitalize">{topLocation.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tap indicator */}
        <div className="absolute bottom-2 right-2 text-xs text-amber-600/80 font-medium">
          Tap to explore →
        </div>
      </div>
    </div>
  );
};

export default LocationOfTheWeek;
