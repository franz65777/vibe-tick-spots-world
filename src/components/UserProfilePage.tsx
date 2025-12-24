import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Bell, BellOff, MoreHorizontal, Ban, Lock } from 'lucide-react';
import saveTagAll from '@/assets/save-tag-all.png';
import saveTagBeen from '@/assets/save-tag-been.png';
import saveTagToTry from '@/assets/save-tag-to-try.png';
import saveTagFavourite from '@/assets/save-tag-favourite.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMutualFollowers } from '@/hooks/useMutualFollowers';
import { useNotificationMuting } from '@/hooks/useNotificationMuting';
import { useUserBlocking } from '@/hooks/useUserBlocking';
import { useUserSavedCities } from '@/hooks/useUserSavedCities';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import ProfileTabs from './profile/ProfileTabs';
import PostsGrid from './profile/PostsGrid';
import TripsGrid from './profile/TripsGrid';
import TaggedPostsGrid from './profile/TaggedPostsGrid';
import BadgeDisplay from './profile/BadgeDisplay';
import Achievements from './profile/Achievements';
import FollowersModal from './profile/FollowersModal';
import SavedLocationsList from './profile/SavedLocationsList';
import ShareProfileModal from './profile/ShareProfileModal';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
const UserProfilePage = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  const { profile, loading, error, followUser, unfollowUser, cancelFollowRequest, followLoading } = useUserProfile(userId);
  const { mutualFollowers, totalCount } = useMutualFollowers(userId);
  const { isMuted, toggleMute } = useNotificationMuting(userId);
  const { isBlocked, blockUser, unblockUser } = useUserBlocking(userId);
  const { cities, commonLocations, categoryCounts } = useUserSavedCities(userId);

  const [activeTab, setActiveTab] = useState('posts');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'followers' | 'following' | null }>({
    isOpen: false,
    type: null,
  });
  const [isLocationsListOpen, setIsLocationsListOpen] = useState(false);
  const [initialFolderId, setInitialFolderId] = useState<string | undefined>(undefined);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);

  const badgesSheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaYRef = useRef<number>(0);

  // Handle initial folder opening from navigation state
  useEffect(() => {
    const state = location.state as {
      openFolderId?: string;
    } | null;
    if (state?.openFolderId) {
      setInitialFolderId(state.openFolderId);
      setIsLocationsListOpen(true);
      // Clear the state to avoid reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const isOwnProfile = currentUser?.id === userId;
  const handleBack = () => {
    const state = location.state as {
      from?: string;
      searchQuery?: string;
      searchMode?: 'locations' | 'users';
      returnTo?: string;
      chatUserId?: string;
    } | null;
    if (state?.returnTo === 'chat' && state?.chatUserId) {
      // Return to chat with specific user
      navigate('/messages', {
        state: {
          initialUserId: state.chatUserId
        },
        replace: true
      });
    } else if (state?.from === 'explore') {
      // Return to explore with preserved search state
      navigate('/explore', {
        state: {
          searchQuery: state.searchQuery || '',
          searchMode: state.searchMode || 'users'
        },
        replace: true
      });
    } else {
      navigate(-1);
    }
  };
  const openModal = (type: 'followers' | 'following') => {
    setModalState({
      isOpen: true,
      type
    });
  };
  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: null
    });
  };
  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };
  const handleFollowToggle = () => {
    if (profile?.is_following) {
      unfollowUser();
    } else if (profile?.follow_request_status === 'pending') {
      cancelFollowRequest();
    } else {
      followUser();
    }
  };

  // Determine follow button text
  const getFollowButtonText = () => {
    if (profile?.is_following) {
      return t('userProfile.alreadyFollowing', { ns: 'common' });
    }
    if (profile?.follow_request_status === 'pending') {
      return t('userProfile.requestSent', { ns: 'common' });
    }
    return t('userProfile.follow', { ns: 'common' });
  };

  const getFollowButtonVariant = () => {
    if (profile?.is_following || profile?.follow_request_status === 'pending') {
      return 'secondary';
    }
    return 'default';
  };
  const handleBlockToggle = async () => {
    if (isBlocked) {
      await unblockUser();
    } else {
      await blockUser();
    }
  };
  if (loading) {
    return <div className="flex flex-col h-full bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>;
  }
  if (error || !profile) {
    return <div className="flex flex-col h-full bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">User not found</p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </div>
      </div>;
  }
  const displayUsername = profile.username || 'Unknown User';
  const renderTabContent = () => {
    // If private account and viewer can't view content, show private message
    if (!isOwnProfile && profile?.is_private && !profile?.can_view_content) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('privateAccount', { ns: 'settings' })}
          </h3>
        </div>
      );
    }

    switch (activeTab) {
      case 'posts':
        return <PostsGrid userId={userId} />;
      case 'trips':
        return <TripsGrid userId={userId} />;
      case 'badges':
        return <Achievements userId={userId} />;
      case 'tagged':
        return <TaggedPostsGrid userId={userId} />;
      default:
        return <PostsGrid userId={userId} />;
    }
  };
  return <div className="flex flex-col h-full bg-background pt-[env(safe-area-inset-top)]">
      {/* Header - Instagram Style */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={handleBack} className="p-0 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">{displayUsername}</h1>
        </div>
        {!isOwnProfile && <div className="flex items-center gap-2">
            {/* Follow Button */}
            <Button
              onClick={handleFollowToggle}
              disabled={followLoading}
              variant={getFollowButtonVariant()}
              className={`rounded-full font-medium h-8 px-4 text-sm ${(profile.is_following || profile.follow_request_status === 'pending') ? 'bg-gray-200 dark:bg-secondary text-gray-600 dark:text-secondary-foreground' : ''}`}
            >
              {getFollowButtonText()}
            </Button>
            {/* Message Button */}
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate('/messages', {
          state: {
            initialUserId: userId,
            fromProfileId: userId
          }
        })} title={t('userProfile.sendMessage', {
          ns: 'common'
        })}>
              <MessageCircle className="w-6 h-6" />
            </Button>
            {/* More Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" title={t('userProfile.moreOptions', {
              ns: 'common'
            })}>
                  <MoreHorizontal className="w-6 h-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleMute}>
                  {isMuted ? <>
                      <Bell className="w-4 h-4 mr-2" />
                      {t('userProfile.unmute', {
                  ns: 'common'
                })}
                    </> : <>
                      <BellOff className="w-4 h-4 mr-2" />
                      {t('userProfile.mute', {
                  ns: 'common'
                })}
                    </>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsShareModalOpen(true)}>
                  {t('userProfile.shareProfile', {
                ns: 'common'
              })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlockToggle} className="text-destructive">
                  <Ban className="w-4 h-4 mr-2" />
                  {isBlocked ? t('userProfile.unblockUser', {
                ns: 'common'
              }) : t('userProfile.blockUser', {
                ns: 'common'
              })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>}
      </div>

      {/* Profile Header - Instagram Style */}
      <div className="px-4 py-1">
        {/* Avatar and Stats Row */}
        <div className="flex items-start gap-3 mb-2">
          {/* Avatar on left */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full">
              <Avatar className="w-full h-full">
                <AvatarImage src={profile.avatar_url || undefined} alt={displayUsername} />
                <AvatarFallback className="text-sm font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Middle: Username and Stats */}
          <div className="flex-1 min-w-0">
            {/* Username */}
            <h2 className="text-base font-bold mt-2">{displayUsername}</h2>
            
            {/* Stats Row - Followers, Following, Saved */}
            <div className="flex gap-3 text-sm mt-2">
              <button 
                onClick={() => (isOwnProfile || profile.can_view_content) && openModal('followers')} 
                className={`hover:opacity-70 transition-opacity ${!isOwnProfile && !profile.can_view_content ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isOwnProfile && !profile.can_view_content}
              >
                <span className="font-bold">{profile.followers_count || 0}</span>{' '}
                <span className="text-muted-foreground">{t('userProfile.followers', {
                  ns: 'common'
                })}</span>
              </button>
              
              <button 
                onClick={() => (isOwnProfile || profile.can_view_content) && openModal('following')} 
                className={`hover:opacity-70 transition-opacity ${!isOwnProfile && !profile.can_view_content ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isOwnProfile && !profile.can_view_content}
              >
                <span className="font-bold">{profile.following_count || 0}</span>{' '}
                <span className="text-muted-foreground">{t('userProfile.following', {
                  ns: 'common'
                })}</span>
              </button>
              
              <button 
                onClick={() => (isOwnProfile || profile.can_view_content) && setIsLocationsListOpen(true)} 
                className={`hover:opacity-70 transition-opacity ${!isOwnProfile && !profile.can_view_content ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isOwnProfile && !profile.can_view_content}
              >
                <span className="font-bold">{profile.places_visited || 0}</span>{' '}
                <span className="text-muted-foreground">{t('userProfile.saved', {
                  ns: 'common'
                })}</span>
              </button>
            </div>
          </div>

          {/* Right: Badges */}
          <div className="shrink-0">
            <BadgeDisplay userId={userId} onBadgesClick={() => setShowBadgesModal(true)} />
          </div>
        </div>

        {/* Full Name (only if different from username) */}
        {profile.full_name && profile.full_name !== displayUsername && <div className="mb-1">
            <h2 className="text-sm font-semibold text-foreground">
              {profile.full_name}
            </h2>
          </div>}

        {/* Bio */}
        {profile.bio && <p className="text-sm text-foreground mb-2">
            {profile.bio}
          </p>}

        {/* Mutual Followers */}
        {!isOwnProfile && mutualFollowers.length > 0 && <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {mutualFollowers.map(follower => <button key={follower.id} onClick={() => navigate(`/profile/${follower.id}`)} className="cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={follower.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {follower.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('userProfile.followedBy', {
            ns: 'common'
          })}{' '}
              <button onClick={() => navigate(`/profile/${mutualFollowers[0]?.id}`)} className="font-semibold text-foreground hover:opacity-70 transition-opacity">
                {mutualFollowers[0]?.username}
              </button>
              {totalCount > 1 && <span> {t('userProfile.andOthers', {
              ns: 'common',
              count: totalCount - 1
            })}</span>}
            </p>
          </div>}

      </div>

      {/* Category Cards Section - always visible; disabled until follow accepted on private profiles */}
      {(() => {
        const canOpenCards = isOwnProfile || profile.can_view_content;
        const disabledClass = !canOpenCards ? 'opacity-50 cursor-not-allowed' : '';

        return (
          <div className="px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {/* In Common Card - Only show for other profiles */}
              {!isOwnProfile && (
                <button
                  onClick={() => canOpenCards && navigate(`/user-places/${userId}`, { state: { filterCategory: 'common' } })}
                  disabled={!canOpenCards}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${disabledClass}`}
                >
                  <div className="flex -space-x-2">
                    <Avatar className="w-7 h-7 border-2 border-background">
                      <AvatarImage src={commonLocations.theirAvatar || undefined} />
                      <AvatarFallback className="text-[10px]">{profile.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-7 h-7 border-2 border-background">
                      <AvatarImage src={commonLocations.myAvatar || undefined} />
                      <AvatarFallback className="text-[10px]">{currentUser?.email?.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm">{commonLocations.count}</span>
                    <span className="text-[10px] text-muted-foreground">{t('userProfile.inCommon', { ns: 'common' })}</span>
                  </div>
                </button>
              )}

              {/* All Locations Card */}
              <button
                onClick={() => canOpenCards && categoryCounts.all > 0 && navigate(`/user-places/${userId}`, { state: { filterCategory: 'all' } })}
                disabled={!canOpenCards || categoryCounts.all === 0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${(!canOpenCards || categoryCounts.all === 0) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <img src={saveTagAll} alt="" className="w-8 h-8 object-contain -my-1" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{categoryCounts.all}</span>
                  <span className="text-[10px] text-muted-foreground">{t('userProfile.allLocations', { ns: 'common' })}</span>
                </div>
              </button>

              {/* Visited Locations Card */}
              <button
                onClick={() => canOpenCards && categoryCounts.been > 0 && navigate(`/user-places/${userId}`, { state: { filterCategory: 'been' } })}
                disabled={!canOpenCards || categoryCounts.been === 0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${(!canOpenCards || categoryCounts.been === 0) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <img src={saveTagBeen} alt="" className="w-8 h-8 object-contain -my-1" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{categoryCounts.been}</span>
                  <span className="text-[10px] text-muted-foreground">{t('userProfile.visitedLocations', { ns: 'common' })}</span>
                </div>
              </button>

              {/* To Try Locations Card */}
              <button
                onClick={() => canOpenCards && categoryCounts.toTry > 0 && navigate(`/user-places/${userId}`, { state: { filterCategory: 'to-try' } })}
                disabled={!canOpenCards || categoryCounts.toTry === 0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${(!canOpenCards || categoryCounts.toTry === 0) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <img src={saveTagToTry} alt="" className="w-8 h-8 object-contain -my-1" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{categoryCounts.toTry}</span>
                  <span className="text-[10px] text-muted-foreground">{t('userProfile.toTryLocations', { ns: 'common' })}</span>
                </div>
              </button>

              {/* Favourite Locations Card */}
              <button
                onClick={() => canOpenCards && categoryCounts.favourite > 0 && navigate(`/user-places/${userId}`, { state: { filterCategory: 'favourite' } })}
                disabled={!canOpenCards || categoryCounts.favourite === 0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0 ${(!canOpenCards || categoryCounts.favourite === 0) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <img src={saveTagFavourite} alt="" className="w-8 h-8 object-contain -my-1" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{categoryCounts.favourite}</span>
                  <span className="text-[10px] text-muted-foreground">{t('userProfile.favouriteLocations', { ns: 'common' })}</span>
                </div>
              </button>
            </div>
          </div>
        );
      })()}

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Tab Content */}
      <div className="flex-1 pb-4 overflow-y-auto">
        {renderTabContent()}
      </div>

      <FollowersModal isOpen={modalState.isOpen} onClose={closeModal} initialTab={modalState.type || 'followers'} userId={userId} />

      <SavedLocationsList isOpen={isLocationsListOpen} onClose={() => {
      setIsLocationsListOpen(false);
      setInitialFolderId(undefined);
    }} userId={userId} initialFolderId={initialFolderId} />

      <ShareProfileModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} profileId={userId || ''} profileUsername={displayUsername} />

      {showBadgesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowBadgesModal(false)}>
          <div
            ref={badgesSheetRef}
            className="bg-background w-full rounded-t-3xl max-h-[80vh] overflow-hidden pb-[calc(5rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (drag from here) */}
            <div
              className="flex justify-center pt-2 pb-1 touch-none"
              onPointerDown={(e) => {
                dragStartYRef.current = e.clientY;
                dragDeltaYRef.current = 0;
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                const sheet = badgesSheetRef.current;
                if (sheet) sheet.style.transition = 'none';
              }}
              onPointerMove={(e) => {
                if (dragStartYRef.current == null) return;
                const delta = e.clientY - dragStartYRef.current;
                if (delta <= 0) return;
                dragDeltaYRef.current = delta;
                const sheet = badgesSheetRef.current;
                if (sheet) sheet.style.transform = `translateY(${delta}px)`;
              }}
              onPointerUp={() => {
                const sheet = badgesSheetRef.current;
                const delta = dragDeltaYRef.current;
                dragStartYRef.current = null;

                if (!sheet) return;
                sheet.style.transition = 'transform 0.2s ease-out';

                if (delta > 80) {
                  sheet.style.transform = 'translateY(100%)';
                  window.setTimeout(() => setShowBadgesModal(false), 200);
                } else {
                  sheet.style.transform = 'translateY(0)';
                }
              }}
              onPointerCancel={() => {
                dragStartYRef.current = null;
                dragDeltaYRef.current = 0;
                const sheet = badgesSheetRef.current;
                if (!sheet) return;
                sheet.style.transition = 'transform 0.2s ease-out';
                sheet.style.transform = 'translateY(0)';
              }}
            >
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            <Achievements userId={userId} />
          </div>
        </div>
      )}
    </div>;
};
export default UserProfilePage;