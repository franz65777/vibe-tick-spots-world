import { MapPin } from 'lucide-react';
import PlaceCard from '@/components/home/PlaceCard';
import { LocationRecommendation } from '@/services/searchService';
import { Place } from '@/types/place';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">{t('noRecommendations', { ns: 'explore' })}</p>
      </div>
    );
  }

  // Convert recommendations to Place format for PlaceCard
  const convertToPlace = (rec: LocationRecommendation): Place => {
    // Ensure visitors is always a string array
    let visitors: string[] = [];
    if (Array.isArray(rec.visitors)) {
      visitors = rec.visitors.map((v: any) => String(v));
    } else if (typeof rec.visitors === 'number') {
      visitors = Array.from({ length: rec.visitors }, (_, i) => `visitor_${i}`);
    }

    // Ensure friendsWhoSaved is always an array
    let friendsWhoSaved: { name: string; avatar: string }[] = [];
    if (Array.isArray(rec.friendsWhoSaved)) {
      friendsWhoSaved = rec.friendsWhoSaved;
    } else if (typeof rec.friendsWhoSaved === 'number') {
      friendsWhoSaved = Array.from({ length: Math.min(rec.friendsWhoSaved, 3) }, (_, i) => ({
        name: `Friend ${i + 1}`,
        avatar: `https://i.pravatar.cc/40?img=${i + 1}`
      }));
    }

    return {
      id: rec.id,
      name: rec.name,
      category: rec.category,
      likes: rec.likes,
      friendsWhoSaved,
      visitors,
      isNew: rec.isNew,
      coordinates: rec.coordinates,
      image: rec.image,
      addedBy: {
        name: typeof rec.addedBy === 'string' ? rec.addedBy : 'Explorer',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        isFollowing: rec.isFollowing || false
      },
      addedDate: rec.addedDate,
      isFollowing: rec.isFollowing,
      popularity: rec.popularity,
      distance: typeof rec.distance === 'number' ? `${rec.distance}km` : rec.distance,
      totalSaves: rec.likes || 23
    };
  };

  // Mock saved state for recommendations
  const isPlaceSaved = (placeId: string) => false;
  const handleSaveToggle = (place: Place) => {
    console.log('Save toggle for recommendation:', place.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t('recommendedForYou', { ns: 'explore' })}</h3>
        <span className="text-sm text-gray-500">{recommendations.length} {t('places', { ns: 'common' })}</span>
      </div>
      
      <div className="space-y-4">
        {recommendations.map((location) => (
          <div key={location.id} className="relative">
            <PlaceCard
              place={convertToPlace(location)}
              isLiked={likedPlaces.has(location.id)}
              isSaved={isPlaceSaved(location.id)}
              onCardClick={() => onLocationClick(location)}
              onLikeToggle={() => onLocationLike(location.id)}
              onSaveToggle={handleSaveToggle}
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

