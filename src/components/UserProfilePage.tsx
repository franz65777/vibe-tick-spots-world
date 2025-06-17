
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import ProfileStats from './profile/ProfileStats';
import ProfileTabs from './profile/ProfileTabs';
import PostsGrid from './profile/PostsGrid';

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { profile, loading, error, followUser, unfollowUser } = useUserProfile(userId);
  const [activeTab, setActiveTab] = useState('posts');

  const isOwnProfile = currentUser?.id === userId;

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'U';
  };

  const handleFollowToggle = () => {
    if (profile?.is_following) {
      unfollowUser();
    } else {
      followUser();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">User not found</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const displayUsername = profile.username || 'Unknown User';
  const displayFullName = profile.full_name;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return <PostsGrid userId={userId} />;
      case 'trips':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 text-sm">No trips to show</p>
          </div>
        );
      case 'badges':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No badges yet</h3>
            <p className="text-gray-600 text-sm">No badges to show</p>
          </div>
        );
      default:
        return <PostsGrid userId={userId} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white pt-16">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold">{displayUsername}</h1>
        <button className="p-2">
          <MoreHorizontal className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 py-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={displayUsername}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-600">{getInitials()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{displayUsername}</h1>
            {displayFullName && (
              <p className="text-gray-600 text-sm mb-2 truncate">{displayFullName}</p>
            )}
            <p className="text-gray-700 text-sm line-clamp-2">
              {profile.bio || 'No bio available'}
            </p>
            
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnProfile && (
          <div className="mb-4">
            <Button 
              onClick={handleFollowToggle}
              variant={profile.is_following ? "outline" : "default"}
              className="w-full"
            >
              {profile.is_following ? 'Following' : 'Follow'}
            </Button>
          </div>
        )}
      </div>
      
      <ProfileStats 
        profile={profile}
        onFollowersClick={() => {}}
        onFollowingClick={() => {}}
        onPostsClick={() => setActiveTab('posts')}
        onLocationsClick={() => {}}
      />
      
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Tab Content */}
      <div className="flex-1 pb-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default UserProfilePage;
