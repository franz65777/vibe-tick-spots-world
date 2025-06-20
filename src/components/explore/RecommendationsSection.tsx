
import React from 'react';
import { MapPin, Users, Sparkles } from 'lucide-react';
import LocationCard from './LocationCard';
import UserCard from './UserCard';
import { CategoryType } from './CategoryFilter';

interface RecommendationsSectionProps {
  searchMode: 'locations' | 'users';
  loading: boolean;
  locationRecommendations: any[];
  userRecommendations: any[];
  selectedCategories?: CategoryType[];
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
  selectedCategories = ['all'],
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

  // Filter locations by selected categories - ensure selectedCategories is always an array
  const safeSelectedCategories = Array.isArray(selectedCategories) ? selectedCategories : ['all'];
  
  const filteredLocations = safeSelectedCategories.includes('all') 
    ? locationRecommendations
    : locationRecommendations.filter(place => 
        safeSelectedCategories.some(cat => 
          place.category?.toLowerCase().includes(cat.toLowerCase())
        )
      );

  const recommendations = searchMode === 'locations' ? filteredLocations : userRecommendations;

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
          {safeSelectedCategories.includes('all') 
            ? `Discover Amazing ${searchMode === 'locations' ? 'Places' : 'People'}`
            : `No ${searchMode === 'locations' ? 'places' : 'people'} found`
          }
        </h3>
        <p className="text-gray-500 text-center text-sm max-w-sm">
          {safeSelectedCategories.includes('all') 
            ? (searchMode === 'locations' 
              ? "We're curating personalized place recommendations for you. Check back soon!"
              : "We're finding interesting people for you to connect with. Come back later!"
            )
            : (searchMode === 'locations'
              ? "Try selecting different categories or check back later for new places!"
              : "Try adjusting your search criteria."
            )
          }
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 mb-4 pt-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Recommended for you
        </h2>
        <p className="text-sm text-gray-600">
          {searchMode === 'locations' 
            ? `${recommendations.length} place${recommendations.length !== 1 ? 's' : ''} you might love`
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
