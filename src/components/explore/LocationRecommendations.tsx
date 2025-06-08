
import { MapPin, Heart, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LocationRecommendation } from '@/services/searchService';

interface LocationRecommendationsProps {
  recommendations: LocationRecommendation[];
  onLocationClick: (location: LocationRecommendation) => void;
}

const LocationRecommendations = ({ recommendations, onLocationClick }: LocationRecommendationsProps) => {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No recommendations available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recommended for you</h3>
        <span className="text-sm text-gray-500">{recommendations.length} places</span>
      </div>
      
      <div className="space-y-3">
        {recommendations.map((location) => (
          <Card 
            key={location.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onLocationClick(location)}
          >
            <CardContent className="p-4">
              <div className="flex gap-3">
                {location.image && (
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 truncate">{location.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{location.category}</p>
                      {location.recommendationReason && (
                        <p className="text-xs text-blue-600 mt-1">{location.recommendationReason}</p>
                      )}
                    </div>
                    
                    {location.isNew && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {location.likes}
                    </div>
                    
                    {location.friendsWhoSaved && location.friendsWhoSaved.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {location.friendsWhoSaved.length} friends saved
                      </div>
                    )}
                    
                    {location.distance !== undefined && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {location.distance}km away
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LocationRecommendations;
