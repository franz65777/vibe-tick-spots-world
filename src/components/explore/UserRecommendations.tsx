
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
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl font-bold text-gray-900">People you might like</h3>
        <span className="text-sm text-gray-500">{recommendations.length} users</span>
      </div>
      
      <div className="space-y-3">
        {recommendations.map((user) => (
          <Card key={user.id} className="border border-gray-200 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div 
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onUserClick(user)}
                >
                  <div className="relative">
                    <img
                      src={`https://images.unsplash.com/${user.avatar}?w=80&h=80&fit=crop&crop=face`}
                      alt={user.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-center mb-3">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{user.name}</h4>
                      <p className="text-blue-600 text-sm font-medium">{user.username}</p>
                    </div>
                    
                    {user.recommendationReason && (
                      <div className="text-center mb-3">
                        <p className="text-blue-600 text-sm font-medium">{user.recommendationReason}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-6 text-sm text-gray-600 mb-3">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{user.followers}</div>
                        <div>followers</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 flex items-center justify-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {user.savedPlaces}
                        </div>
                        <div>places</div>
                      </div>
                      {user.mutualFollowers && user.mutualFollowers > 0 && (
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{user.mutualFollowers}</div>
                          <div>mutual</div>
                        </div>
                      )}
                    </div>
                    
                    {user.sharedInterests && user.sharedInterests.length > 0 && (
                      <div className="flex gap-2 justify-center flex-wrap mb-3">
                        {user.sharedInterests.slice(0, 2).map((interest) => (
                          <span 
                            key={interest}
                            className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full font-medium"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  size="lg"
                  variant={user.isFollowing ? "outline" : "default"}
                  className={`ml-4 px-6 py-2 rounded-full font-semibold ${
                    user.isFollowing 
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
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
