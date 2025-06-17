
import { Users, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserRecommendation } from '@/services/searchService';

interface UserRecommendationsProps {
  recommendations: UserRecommendation[];
  onUserClick: (user: UserRecommendation) => void;
  onFollowUser: (userId: string) => void;
}

const UserRecommendations = ({ recommendations, onUserClick, onFollowUser }: UserRecommendationsProps) => {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No user recommendations available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">People you might like</h3>
        <span className="text-sm text-gray-500">{recommendations.length} users</span>
      </div>
      
      <div className="space-y-3">
        {recommendations.map((user) => (
          <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div 
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onUserClick(user)}
                >
                  <img
                    src={`https://images.unsplash.com/${user.avatar}?w=48&h=48&fit=crop&crop=face`}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate text-sm">{user.name}</h4>
                    <p className="text-sm text-gray-600 truncate">{user.username}</p>
                    
                    {user.recommendationReason && (
                      <p className="text-xs text-blue-600 mt-1 truncate">{user.recommendationReason}</p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{user.followers} followers</span>
                      <span>
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {user.savedPlaces} places
                      </span>
                      {user.mutualFollowers && user.mutualFollowers > 0 && (
                        <span>{user.mutualFollowers} mutual</span>
                      )}
                    </div>
                    
                    {user.sharedInterests && user.sharedInterests.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {user.sharedInterests.slice(0, 2).map((interest) => (
                          <span 
                            key={interest}
                            className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant={user.isFollowing ? "outline" : "default"}
                  className="ml-2 flex-shrink-0 px-3 py-1 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Following user from recommendations:', user.id);
                    onFollowUser(user.id);
                  }}
                >
                  {user.isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserRecommendations;
