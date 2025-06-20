
import React from 'react';
import { MapPin, Users, Sparkles } from 'lucide-react';
import LocationCard from './LocationCard';
import UserCard from './UserCard';

interface RecommendationsSectionProps {
  searchMode: 'locations' | 'users';
  loading: boolean;
  locationRecommendations: any[];
  userRecommendations: any[];
  onLocationClick: (place: any) => void;
  onUserClick: (user: any) => void;
  onFollowUser: (userId: string) => void;
  onLocationShare: (place: any) => void;
  onLocationComment: (place: any) => void;
  onLocationLike: (placeId: string) => void;
  likedPlaces: Set<string>;
  onMessageUser: (userId: string) => void;
}

const RecommendationsSection = ({
  searchMode,
  loading,
  locationRecommendations,
  userRecommendations,
  onLocationClick,
  onUserClick,
  onFollowUser,
  onMessageUser
}: RecommendationsSectionProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading recommendations...</span>
        </div>
      </div>
    );
  }

  const recommendations = searchMode === 'locations' ? locationRecommendations : userRecommendations;

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
          {searchMode === 'locations' ? (
            <MapPin className="w-8 h-8 text-blue-600" />
          ) : (
            <Users className="w-8 h-8 text-purple-600" />
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Discover Amazing {searchMode === 'locations' ? 'Places' : 'People'}
        </h3>
        <p className="text-gray-500 text-center text-sm max-w-sm">
          {searchMode === 'locations' 
            ? "We're curating personalized place recommendations for you. Check back soon!"
            : "We're finding interesting people for you to connect with. Come back later!"
          }
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Recommended for you
        </h2>
        <p className="text-sm text-gray-600">
          {searchMode === 'locations' 
            ? `${recommendations.length} places you might love`
            : `${recommendations.length} people you might want to follow`
          }
        </p>
      </div>

      {searchMode === 'locations' ? (
        <div className="space-y-0">
          {recommendations.map((place) => (
            <LocationCard
              key={place.id}
              place={place}
              onCardClick={onLocationClick}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {recommendations.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onUserClick={onUserClick}
              onFollowUser={onFollowUser}
              onMessageUser={onMessageUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationsSection;
