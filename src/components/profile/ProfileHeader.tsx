
import { Camera, Settings, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';

interface ProfileHeaderProps {
  onBadgeClick: () => void;
}

const ProfileHeader = ({ onBadgeClick }: ProfileHeaderProps) => {
  const { profile } = useProfile();

  if (!profile) {
    return (
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
        </div>
      </div>
    );
  }

  const isBusinessUser = profile.is_business_user || false;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Cover Photo */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-4">
        <div className="flex flex-col items-center -mt-12">
          {/* Profile Picture */}
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage 
                src={profile.avatar_url || `https://images.unsplash.com/photo-1494790108755-2616b5a5c75b?w=96&h=96&fit=crop&crop=face`} 
                alt={profile.full_name || 'Profile'} 
              />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-100 to-purple-100">
                {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-white shadow-md"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>

          {/* Name and Title */}
          <div className="text-center mt-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {profile.full_name || profile.username || 'Unknown User'}
              </h1>
              
              {/* Business Badge */}
              {isBusinessUser && (
                <Badge variant="default" className="bg-blue-600 text-white text-xs">
                  Business
                </Badge>
              )}
              
              {/* Badges Icon */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onBadgeClick}
                className="w-6 h-6 p-0 hover:bg-gray-100"
              >
                <Award className="w-4 h-4 text-yellow-600" />
              </Button>
            </div>
            
            {profile.bio && (
              <p className="text-gray-600 text-sm max-w-xs">
                {profile.bio}
              </p>
            )}
            
            {profile.current_city && (
              <p className="text-gray-500 text-sm mt-1">
                📍 {profile.current_city}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 w-full max-w-xs">
            <Button className="flex-1" size="sm">
              Edit Profile
            </Button>
            <Button variant="outline" className="flex-1" size="sm">
              Share Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
