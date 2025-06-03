
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
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <ArrowLeft className="w-6 h-6 text-gray-600" />
        <MoreHorizontal className="w-6 h-6 text-gray-600" />
      </div>

      <div className="flex items-start gap-4 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-white p-1">
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={displayUsername}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-lg font-semibold text-gray-600">{getInitials()}</span>
                )}
              </div>
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{displayUsername}</h1>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded-full">
                Elite
              </Button>
            </div>
            <BadgeDisplay />
          </div>
          {displayFullName && (
            <p className="text-gray-600 text-sm mb-2">{displayFullName}</p>
          )}
          <p className="text-gray-700 text-sm">
            {profile?.bio || 'Travel Enthusiast | Food Lover | Photographer'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
