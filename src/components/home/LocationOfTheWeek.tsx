
import React from 'react';
import { MapPin, Heart, Users } from 'lucide-react';
import { Place } from '@/types/place';

interface LocationOfTheWeekProps {
  topLocation: any; // Using any to handle the converted map pin
  onLocationClick: (place: Place) => void;
}

const LocationOfTheWeek = ({ topLocation, onLocationClick }: LocationOfTheWeekProps) => {
  if (!topLocation) return null;

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
    <div className="mx-3 mb-2">
      <div 
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-3 border border-amber-200/50 cursor-pointer hover:shadow-md transition-all duration-300"
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          {/* Location Image */}
          <div className="relative">
            <img 
              src={topLocation.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'} 
              alt={topLocation.name}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover"
            />
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-1">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{topLocation.name}</h3>
              <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                Location of the Week ✨
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-400" />
                <span className="font-medium">{topLocation.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-400" />
                <span className="font-medium">{getVisitorCount()}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-400" />
                <span className="font-medium capitalize">{topLocation.category}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationOfTheWeek;
