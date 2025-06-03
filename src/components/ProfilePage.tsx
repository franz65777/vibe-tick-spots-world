
import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import ProfileHeader from './profile/ProfileHeader';
import ProfileStats from './profile/ProfileStats';
import ProfileTabs from './profile/ProfileTabs';
import Achievements from './profile/Achievements';
import FollowersModal from './profile/FollowersModal';

const ProfilePage = () => {
  const { profile, loading, error } = useProfile();
  const { user } = useAuth();
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

  const handlePostsClick = () => {
    // In a real app, this would navigate to a posts view or filter the content
    console.log('Navigate to posts view');
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

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-600">Error loading profile: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <ProfileHeader />
      
      <ProfileStats 
        onFollowersClick={() => openModal('followers')}
        onFollowingClick={() => openModal('following')}
        onPostsClick={handlePostsClick}
      />
      
      <ProfileTabs />
      <Achievements />

      {/* Content Area */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-100 rounded-xl h-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-60"></div>
          </div>
          <div className="bg-gray-100 rounded-xl h-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-60"></div>
          </div>
        </div>
      </div>

      <FollowersModal 
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type || 'followers'}
      />
    </div>
  );
};

export default ProfilePage;
