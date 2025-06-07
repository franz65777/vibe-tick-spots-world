
import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useBadges } from '@/hooks/useBadges';
import ProfileHeader from './profile/ProfileHeader';
import ProfileStats from './profile/ProfileStats';
import ProfileTabs from './profile/ProfileTabs';
import TravelStats from './profile/TravelStats';
import PostsGrid from './profile/PostsGrid';
import TripsGrid from './profile/TripsGrid';
import BadgeModal from './profile/BadgeModal';
import FollowersModal from './profile/FollowersModal';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

const ProfilePage = () => {
  const { profile } = useProfile();
  const { userBadges } = useBadges();
  const [activeTab, setActiveTab] = useState('travel');
  const [showBadges, setShowBadges] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const handleBusinessDashboard = () => {
    console.log('Navigate to business dashboard');
  };

  const isBusinessUser = profile?.is_business_user || false;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ProfileHeader 
        onBadgeClick={() => setShowBadges(true)} 
      />
      
      <ProfileStats
        onFollowersClick={() => setShowFollowers(true)}
        onFollowingClick={() => setShowFollowing(true)}
        onPostsClick={() => setActiveTab('posts')}
      />

      {/* Business Dashboard Button */}
      {isBusinessUser && (
        <div className="px-6 py-3 bg-white border-b border-gray-100">
          <Button
            onClick={handleBusinessDashboard}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            Business Dashboard
          </Button>
        </div>
      )}

      <ProfileTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'travel' && <TravelStats />}
        {activeTab === 'posts' && <PostsGrid />}
        {activeTab === 'trips' && <TripsGrid />}
        {activeTab === 'badges' && (
          <div className="p-4">
            <div className="text-center py-8">
              <p className="text-gray-500">Badge achievements will be displayed here</p>
            </div>
          </div>
        )}
      </div>

      <BadgeModal
        isOpen={showBadges}
        onClose={() => setShowBadges(false)}
        badges={userBadges}
      />

      <FollowersModal
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        type="followers"
      />

      <FollowersModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        type="following"
      />
    </div>
  );
};

export default ProfilePage;
