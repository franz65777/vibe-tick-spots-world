
import { useProfile } from '@/hooks/useProfile';
import { useFollowStats } from '@/hooks/useFollowStats';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useTranslation } from 'react-i18next';

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
  
  // Use external profile if provided (for viewing other users), otherwise use current user profile
  const profile = externalProfile || currentUserProfile;
  const savedPlacesStats = getStats();

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
          <div className="text-sm text-gray-600">{t('profile:posts')}</div>
        </button>
        
        <button 
          className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          onClick={onFollowersClick}
        >
          <div className="text-xl font-bold text-gray-900">{displayStats.followers}</div>
          <div className="text-sm text-gray-600">{t('common:followers')}</div>
        </button>
        
        <button 
          className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          onClick={onFollowingClick}
        >
          <div className="text-xl font-bold text-gray-900">{displayStats.following}</div>
          <div className="text-sm text-gray-600">{t('common:followingTab')}</div>
        </button>
        
        <button 
          className="text-center hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          onClick={onLocationsClick}
        >
          <div className="text-xl font-bold text-gray-900">{displayStats.locations}</div>
          <div className="text-sm text-gray-600">{t('mapFilters:saved')}</div>
        </button>
      </div>
    </div>
  );
};

export default ProfileStats;
