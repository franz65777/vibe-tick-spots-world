
import React from 'react';
import { Star, Users, MapPin, Heart, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationRecommendation {
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
  recommendations: LocationRecommendation[];
  onLocationClick: (location: LocationRecommendation) => void;
  onLocationShare: (location: LocationRecommendation) => void;
  onLocationComment: (location: LocationRecommendation) => void;
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
  // Default recommendations if none provided
  const defaultRecommendations: LocationRecommendation[] = [
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
                
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span>{place.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{place.totalSaves}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-xs px-2 py-1 h-auto ${
                      likedPlaces.has(place.id)
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationLike(place.id);
                    }}
                  >
                    <Heart className={`w-3 h-3 mr-1 ${likedPlaces.has(place.id) ? 'fill-current' : ''}`} />
                    Like
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1 h-auto text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationComment(place);
                    }}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Comment
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1 h-auto text-gray-600 hover:text-green-600 hover:bg-green-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLocationShare(place);
                    }}
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    Share
                  </Button>
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
