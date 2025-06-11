
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import BadgeDisplay from './BadgeDisplay';
import ProfileOptionsModal from './ProfileOptionsModal';

const ProfileHeader = () => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const displayUsername = profile?.username || user?.email?.split('@')[0] || 'user';
  const displayFullName = profile?.full_name;

  return (
    <>
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
          <button
            onClick={() => setIsOptionsModalOpen(true)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex items-start gap-3 mb-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={displayUsername}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-gray-600">{getInitials()}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-base font-bold text-gray-900 truncate">{displayUsername}</h1>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1 rounded-full min-h-[20px] h-5 shrink-0">
                  Elite
                </Button>
              </div>
              <BadgeDisplay />
            </div>
            {displayFullName && (
              <p className="text-gray-600 text-xs mb-1 truncate">{displayFullName}</p>
            )}
            <p className="text-gray-700 text-xs line-clamp-2">
              {profile?.bio || 'Travel Enthusiast | Food Lover | Photographer'}
            </p>
          </div>
        </div>
      </div>

      <ProfileOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
      />
    </>
  );
};

export default ProfileHeader;
