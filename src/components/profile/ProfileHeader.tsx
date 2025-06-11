
import { MoreHorizontal, Building2, Edit, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import BadgeDisplay from './BadgeDisplay';
import EditProfileModal from './EditProfileModal';

const ProfileHeader = () => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Mock business account status - in a real app, this would come from the backend
  const hasBusinessAccount = true; // This should be fetched from user's business status

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const displayUsername = profile?.username || user?.email?.split('@')[0] || 'user';
  const displayFullName = profile?.full_name;

  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-end mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreHorizontal className="w-6 h-6 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-white p-1">
              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
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
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{displayUsername}</h1>
              {hasBusinessAccount && (
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <BadgeDisplay />
          </div>
          {displayFullName && (
            <p className="text-gray-600 text-sm mb-2 truncate">{displayFullName}</p>
          )}
          <p className="text-gray-700 text-sm line-clamp-2">
            {profile?.bio || 'Travel Enthusiast | Food Lover | Photographer'}
          </p>
        </div>
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
      />
    </div>
  );
};

export default ProfileHeader;
