
import LocationRecommendations from './LocationRecommendations';
import UserRecommendations from './UserRecommendations';
import { LocationRecommendation, UserRecommendation } from '@/services/searchService';

interface RecommendationsSectionProps {
  searchMode: 'locations' | 'users';
  loading: boolean;
  locationRecommendations: LocationRecommendation[];
  userRecommendations: UserRecommendation[];
  onLocationClick: (location: LocationRecommendation) => void;
  onUserClick: (user: UserRecommendation) => void;
  onFollowUser: (userId: string) => void;
  onLocationShare: (location: LocationRecommendation) => void;
  onLocationComment: (location: LocationRecommendation) => void;
  onLocationLike: (locationId: string) => void;
  likedPlaces: Set<string>;
  onMessageUser?: (userId: string) => void;
}

const RecommendationsSection = ({
  searchMode,
  loading,
  locationRecommendations,
  userRecommendations,
  onLocationClick,
  onUserClick,
  onFollowUser,
  onLocationShare,
  onLocationComment,
  onLocationLike,
  likedPlaces,
  onMessageUser
}: RecommendationsSectionProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading recommendations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {searchMode === 'locations' ? (
        <LocationRecommendations
          recommendations={locationRecommendations}
          onLocationClick={onLocationClick}
          onLocationShare={onLocationShare}
          onLocationComment={onLocationComment}
          onLocationLike={onLocationLike}
          likedPlaces={likedPlaces}
        />
      ) : (
        <UserRecommendations
          recommendations={userRecommendations}
          onUserClick={onUserClick}
          onFollowUser={onFollowUser}
          onMessageUser={onMessageUser}
        />
      )}
    </div>
  );
};

export default RecommendationsSection;
