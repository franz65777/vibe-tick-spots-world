
import React from 'react';
import { MapPin, Heart, Users, BookOpen } from 'lucide-react';
import { Place } from '@/types/place';
import { useLocationOfTheWeek } from '@/hooks/useLocationOfTheWeek';

interface LocationOfTheWeekProps {
  onLocationClick: (place: Place) => void;
}

const LocationOfTheWeek = ({ onLocationClick }: LocationOfTheWeekProps) => {
  const { locationOfTheWeek, loading } = useLocationOfTheWeek();

  if (loading) {
    return (
      <div className="mx-3 mb-2">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-3 border border-amber-200/50 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!locationOfTheWeek) return null;

  // Convert to proper Place format for the click handler
  const convertToPlace = (): Place => ({
    id: locationOfTheWeek.location_id,
    name: locationOfTheWeek.location_name,
    category: locationOfTheWeek.location_category,
    likes: locationOfTheWeek.total_likes,
    friendsWhoSaved: [],
    visitors: [],
    isNew: false,
    coordinates: {
      lat: locationOfTheWeek.latitude,
      lng: locationOfTheWeek.longitude
    },
    image: locationOfTheWeek.image_url,
    addedBy: 'Community',
    addedDate: new Date().toLocaleDateString(),
    isFollowing: false,
    popularity: locationOfTheWeek.total_score,
    totalSaves: locationOfTheWeek.total_saves,
    address: locationOfTheWeek.location_address
  });

  const handleClick = () => {
    onLocationClick(convertToPlace());
  };

  return (
    <div className="mx-3 mb-2">
      <div 
        className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-3 border border-purple-200/50 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          {/* Location Image */}
          <div className="relative">
            <img 
              src={locationOfTheWeek.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop'} 
              alt={locationOfTheWeek.location_name}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover"
            />
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full p-1">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{locationOfTheWeek.location_name}</h3>
              <span className="text-xs text-purple-600 font-medium bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">
                📚 Library of the Week
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-400" />
                <span className="font-medium">{locationOfTheWeek.total_likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-400" />
                <span className="font-medium">{locationOfTheWeek.total_saves}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-400" />
                <span className="font-medium">Score: {locationOfTheWeek.total_score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationOfTheWeek;
