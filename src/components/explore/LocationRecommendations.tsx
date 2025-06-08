
import { MapPin } from 'lucide-react';
import PlaceCard from '@/components/home/PlaceCard';
import { LocationRecommendation } from '@/services/searchService';

interface LocationRecommendationsProps {
  recommendations: LocationRecommendation[];
  onLocationClick: (location: LocationRecommendation) => void;
  onLocationShare: (location: LocationRecommendation) => void;
  onLocationComment: (location: LocationRecommendation) => void;
  onLocationLike: (locationId: string) => void;
  likedPlaces: Set<string>;
}

const LocationRecommendations = ({ 
  recommendations, 
  onLocationClick, 
  onLocationShare, 
  onLocationComment, 
  onLocationLike,
  likedPlaces 
}: LocationRecommendationsProps) => {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No recommendations available</p>
      </div>
    );
  }

  // Convert recommendations to Place format for PlaceCard
  const convertToPlace = (rec: LocationRecommendation) => ({
    id: rec.id,
    name: rec.name,
    category: rec.category,
    likes: rec.likes,
    friendsWhoSaved: rec.friendsWhoSaved,
    visitors: rec.visitors,
    isNew: rec.isNew,
    coordinates: rec.coordinates,
    image: rec.image,
    addedBy: rec.addedBy,
    addedDate: rec.addedDate,
    isFollowing: rec.isFollowing,
    popularity: rec.popularity,
    distance: rec.distance,
    totalSaves: rec.likes || 23
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recommended for you</h3>
        <span className="text-sm text-gray-500">{recommendations.length} places</span>
      </div>
      
      <div className="space-y-4">
        {recommendations.map((location) => (
          <div key={location.id} className="relative">
            <PlaceCard
              place={convertToPlace(location)}
              isLiked={likedPlaces.has(location.id)}
              onCardClick={() => onLocationClick(location)}
              onLikeToggle={() => onLocationLike(location.id)}
              onShare={() => onLocationShare(location)}
              onComment={() => onLocationComment(location)}
              cityName="Current City"
            />
            {/* Recommendation reason overlay */}
            {location.recommendationReason && (
              <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white text-xs px-3 py-1 rounded-full z-10 backdrop-blur-sm">
                {location.recommendationReason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationRecommendations;
