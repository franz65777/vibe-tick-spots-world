
import { useProfile } from '@/hooks/useProfile';
import { useFollowStats } from '@/hooks/useFollowStats';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useSuperUser } from '@/hooks/useSuperUser';
import { useTranslation } from 'react-i18next';
import fireIcon from '@/assets/fire-icon-3d.png';

interface ProfileStatsProps {
  profile?: any;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onPostsClick: () => void;
  onLocationsClick: () => void;
}

const ProfileStats = ({ 
  profile: externalProfile,
  onFollowersClick, 
  onFollowingClick, 
  onPostsClick, 
  onLocationsClick 
}: ProfileStatsProps) => {
  const { t } = useTranslation();
  const { profile: currentUserProfile } = useProfile();
  const { stats } = useFollowStats();
  const { getStats } = useSavedPlaces();
  const { superUser } = useSuperUser();
  
  // Use external profile if provided (for viewing other users), otherwise use current user profile
  const profile = externalProfile || currentUserProfile;
  const savedPlacesStats = getStats();
  const currentStreak = superUser?.current_streak || 0;

  // Use profile data if available, otherwise fall back to stats
  const displayStats = {
    posts: profile?.posts_count || stats.postsCount,
    followers: profile?.followers_count || stats.followersCount,
    following: profile?.following_count || stats.followingCount,
    locations: savedPlacesStats.places
  };

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex justify-around">
        <button 
          className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          onClick={onPostsClick}
        >
          <div className="text-xl font-bold text-gray-900">{displayStats.posts}</div>
          <div className="text-sm text-gray-600">{t('posts', { ns: 'profile', defaultValue: 'Posts' })}</div>
        </button>
        
        <button 
          className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          onClick={onFollowersClick}
        >
          <div className="text-xl font-bold text-gray-900">{displayStats.followers}</div>
          <div className="text-sm text-gray-600">{t('followers', { ns: 'profile', defaultValue: 'Followers' })}</div>
        </button>
        
        <button 
          className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          onClick={onFollowingClick}
        >
          <div className="text-xl font-bold text-gray-900">{displayStats.following}</div>
          <div className="text-sm text-gray-600">{t('following', { ns: 'profile', defaultValue: 'Following' })}</div>
        </button>
        
        <button 
          className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors relative"
          onClick={onLocationsClick}
        >
          <div className="flex items-center justify-center gap-1">
            <div className="text-xl font-bold text-gray-900">{displayStats.locations}</div>
            {currentStreak > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-[10px] font-bold">
                <img src={fireIcon} alt="streak" className="w-3 h-3" style={{ transform: 'scaleX(0.85)' }} />
                <span>{currentStreak}w</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">{t('saved', { ns: 'profile', defaultValue: 'Saved' })}</div>
        </button>
      </div>
    </div>
  );
};

export default ProfileStats;
