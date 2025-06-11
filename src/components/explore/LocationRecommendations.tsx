
import React from 'react';
import { Star, Users, MapPin } from 'lucide-react';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
}

interface LocationRecommendationsProps {
  recommendations: any[];
  onLocationClick: (location: any) => void;
  onLocationShare: (location: any) => void;
  onLocationComment: (location: any) => void;
  onLocationLike: (locationId: string) => void;
  likedPlaces: Set<string>;
}

const LocationRecommendations = ({ 
  recommendations = [], 
  onLocationClick, 
  onLocationShare, 
  onLocationComment, 
  onLocationLike, 
  likedPlaces 
}: LocationRecommendationsProps) => {
  const defaultRecommendations: Place[] = [
    {
      id: 'rec-1',
      name: 'ABBA The Museum',
      category: 'Museum',
      likes: 298,
      friendsWhoSaved: [
        { name: 'Lisa', avatar: '/api/placeholder/32/32' },
        { name: 'Mike', avatar: '/api/placeholder/32/32' }
      ],
      visitors: ['Lisa', 'Mike', 'Sarah'],
      isNew: false,
      coordinates: { lat: 59.3267, lng: 18.0955 },
      rating: 4.5,
      reviews: 187,
      distance: '1.8 km',
      addedBy: { name: 'Lisa', avatar: '/api/placeholder/32/32', isFollowing: true },
      addedDate: '2024-01-12',
      image: '/api/placeholder/300/200',
      description: 'Interactive museum about the famous Swedish pop group',
      totalSaves: 298
    }
  ];

  const displayRecommendations = recommendations.length > 0 ? recommendations : defaultRecommendations;

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Recommended for You
        </h2>
      </div>
      
      <div className="space-y-4">
        {displayRecommendations.map((place) => (
          <div 
            key={place.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            onClick={() => onLocationClick(place)}
          >
            <div className="flex">
              <img 
                src={place.image} 
                alt={place.name}
                className="w-24 h-24 object-cover flex-shrink-0"
              />
              <div className="flex-1 p-3">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{place.name}</h3>
                <p className="text-gray-600 text-xs mb-2">{place.category} • {place.distance}</p>
                
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span>{place.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{place.totalSaves}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationRecommendations;
