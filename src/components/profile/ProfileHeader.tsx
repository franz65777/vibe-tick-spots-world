
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import BadgeDisplay from './BadgeDisplay';

const ProfileHeader = () => {
  const { profile } = useProfile();
  const { user } = useAuth();

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
    <div className="px-5 py-5 sm:px-4 sm:py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <ArrowLeft className="w-7 h-7 sm:w-6 sm:h-6 text-gray-600" />
        <MoreHorizontal className="w-7 h-7 sm:w-6 sm:h-6 text-gray-600" />
      </div>

      <div className="flex items-start gap-5 sm:gap-4 mb-6">
        <div className="relative">
          <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-white p-1">
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={displayUsername}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-xl sm:text-lg font-semibold text-gray-600">{getInitials()}</span>
                )}
              </div>
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-6 h-6 sm:w-5 sm:h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 sm:w-2 sm:h-2 bg-white rounded-full"></div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 sm:mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-xl font-bold text-gray-900">{displayUsername}</h1>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-xs px-4 py-2 sm:px-3 sm:py-1 rounded-full min-h-[32px] sm:min-h-[28px]">
                Elite
              </Button>
            </div>
            <BadgeDisplay />
          </div>
          {displayFullName && (
            <p className="text-gray-600 text-base sm:text-sm mb-3 sm:mb-2">{displayFullName}</p>
          )}
          <p className="text-gray-700 text-base sm:text-sm">
            {profile?.bio || 'Travel Enthusiast | Food Lover | Photographer'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
