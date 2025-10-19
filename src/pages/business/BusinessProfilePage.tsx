import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Send, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileTabs from '@/components/profile/ProfileTabs';
import PostsGrid from '@/components/profile/PostsGrid';
import TaggedPostsGrid from '@/components/profile/TaggedPostsGrid';
import FollowersModal from '@/components/profile/FollowersModal';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useUserBadges } from '@/hooks/useUserBadges';
import Achievements from '@/components/profile/Achievements';

const BusinessProfilePage = () => {
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { businessProfile } = useBusinessProfile();
  const { badges } = useUserBadges();

  const [activeTab, setActiveTab] = useState('posts');
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'followers' | 'following' | null }>({
    isOpen: false,
    type: null
  });

  const openModal = (type: 'followers' | 'following') => {
    setModalState({ isOpen: true, type });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header with actions */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-xl font-bold">Business Profile</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/notifications')}
              className="relative"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/messages')}
            >
              <Send className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/business/settings')}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          isOwnProfile={true}
          onFollowersClick={() => openModal('followers')}
          onFollowingClick={() => openModal('following')}
        />

        {/* Stats */}
        <ProfileStats
          userId={user.id}
          onPostsClick={() => setActiveTab('posts')}
          onLocationsClick={() => {}}
          hideLocations={true}
        />

        {/* Badges */}
        {badges.filter(b => b.earned).length > 0 && (
          <div className="px-4 py-3">
            <Achievements
              badges={badges}
              isOwnProfile={true}
              onBadgeClick={(badge) => {}}
              hasNewBadges={false}
            />
          </div>
        )}

        {/* Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showTrips={false}
          showLocations={false}
          showMarketing={true}
        />

        {/* Tab Content */}
        <div className="px-4 py-4">
          {activeTab === 'posts' && <PostsGrid userId={user.id} />}
          {activeTab === 'marketing' && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Marketing content management coming soon</p>
            </div>
          )}
          {activeTab === 'tagged' && <TaggedPostsGrid userId={user.id} />}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-lg border ${
                    badge.earned
                      ? 'bg-card border-border'
                      : 'bg-muted/20 border-muted opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{badge.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                      {badge.earned && badge.earnedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <FollowersModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          type={modalState.type}
          userId={user.id}
        />
      </div>
    </div>
  );
};

export default BusinessProfilePage;
