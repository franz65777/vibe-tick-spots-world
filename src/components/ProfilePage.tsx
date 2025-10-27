
import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProfileHeader from './profile/ProfileHeader';
import ProfileStats from './profile/ProfileStats';
import ProfileTabs from './profile/ProfileTabs';
import Achievements from './profile/Achievements';
import PostsGrid from './profile/PostsGrid';
import TripsGrid from './profile/TripsGrid';
import TaggedPostsGrid from './profile/TaggedPostsGrid';
import FollowersModal from './profile/FollowersModal';
import SavedLocationsList from './profile/SavedLocationsList';
import { useUserBadges } from '@/hooks/useUserBadges';
import { ThemeToggle } from './ThemeToggle';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { profile, loading, error } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { businessProfile, hasValidBusinessAccount, loading: businessLoading } = useBusinessProfile();
  const [activeTab, setActiveTab] = useState('posts');
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'followers' | 'following' | null }>({
    isOpen: false,
    type: null
  });
  const [isLocationsListOpen, setIsLocationsListOpen] = useState(false);
  const { badges } = useUserBadges();
  const [lastBadgeCount, setLastBadgeCount] = useState(0);
  const [hasNewBadges, setHasNewBadges] = useState(false);

  const handleSwitchToBusinessView = () => {
    if (!hasValidBusinessAccount) {
      toast.error(t('profile.noBusinessAccount'), {
        description: t('profile.needVerification')
      });
      return;
    }
    // Note: localStorage only used for UI preference, not authorization
    // Actual authorization is verified server-side via business_profiles table
    localStorage.setItem('accountMode', 'business');
    navigate('/business');
  };

  // Track new badges
  useEffect(() => {
    const earnedCount = badges.filter(b => b.earned).length;
    if (lastBadgeCount > 0 && earnedCount > lastBadgeCount) {
      setHasNewBadges(true);
    }
    setLastBadgeCount(earnedCount);
  }, [badges]);

  // Clear new badge indicator when viewing badges tab
  useEffect(() => {
    if (activeTab === 'badges') {
      setHasNewBadges(false);
    }
  }, [activeTab]);

  const openModal = (type: 'followers' | 'following') => {
    setModalState({ isOpen: true, type });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null });
  };

  const handlePostsClick = () => {
    setActiveTab('posts');
  };

  const handleLocationsClick = () => {
    setIsLocationsListOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading profile: {error}</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return <PostsGrid />;
      case 'trips':
        return <TripsGrid />;
      case 'badges':
        return <Achievements userId={user?.id} />;
      case 'tagged':
        return <TaggedPostsGrid />;
      default:
        return <PostsGrid />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ProfileHeader 
        onFollowersClick={() => openModal('followers')}
        onFollowingClick={() => openModal('following')}
        onPostsClick={handlePostsClick}
        onLocationsClick={handleLocationsClick}
      />
      
      {/* Business Dashboard Link - Only show if user has verified business */}
      {!businessLoading && hasValidBusinessAccount && (
        <div className="px-4 py-2">
          <Button
            onClick={handleSwitchToBusinessView}
            variant="outline"
            className="w-full"
          >
            <Building2 className="w-4 h-4 mr-2" />
            {t('profile.switchToBusiness')}
          </Button>
        </div>
      )}
      
      <ProfileTabs
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        hasNewBadges={hasNewBadges}
      />
      
      {/* Tab Content */}
      <div className="flex-1 pb-4">
        {renderTabContent()}
      </div>

      <FollowersModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type || 'followers'}
      />

      <SavedLocationsList
        isOpen={isLocationsListOpen}
        onClose={() => setIsLocationsListOpen(false)}
      />
    </div>
  );
};

export default ProfilePage;
