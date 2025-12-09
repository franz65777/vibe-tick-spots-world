import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Bell, BellOff, MoreHorizontal, ChevronDown, Ban, Globe, Eye, Bookmark, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMutualFollowers } from '@/hooks/useMutualFollowers';
import { useNotificationMuting } from '@/hooks/useNotificationMuting';
import { useUserBlocking } from '@/hooks/useUserBlocking';
import { useUserSavedCities } from '@/hooks/useUserSavedCities';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import ProfileTabs from './profile/ProfileTabs';
import PostsGrid from './profile/PostsGrid';
import TripsGrid from './profile/TripsGrid';
import TaggedPostsGrid from './profile/TaggedPostsGrid';
import BadgeDisplay from './profile/BadgeDisplay';
import Achievements from './profile/Achievements';
import FollowersModal from './profile/FollowersModal';
import SavedLocationsList from './profile/SavedLocationsList';
import ShareProfileModal from './profile/ShareProfileModal';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
const UserProfilePage = () => {
  const {
    t
  } = useTranslation();
  const {
    userId
  } = useParams<{
    userId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user: currentUser
  } = useAuth();
  const {
    profile,
    loading,
    error,
    followUser,
    unfollowUser
  } = useUserProfile(userId);
  const {
    mutualFollowers,
    totalCount
  } = useMutualFollowers(userId);
  const {
    isMuted,
    toggleMute
  } = useNotificationMuting(userId);
  const {
    isBlocked,
    blockUser,
    unblockUser
  } = useUserBlocking(userId);
  const {
    cities,
    commonLocations,
    categoryCounts
  } = useUserSavedCities(userId);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'followers' | 'following' | null;
  }>({
    isOpen: false,
    type: null
  });
  const [isLocationsListOpen, setIsLocationsListOpen] = useState(false);
  const [initialFolderId, setInitialFolderId] = useState<string | undefined>(undefined);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);

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
    } else {
      followUser();
    }
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
            <Button onClick={handleFollowToggle} variant={profile.is_following ? "secondary" : "default"} className={`rounded-full font-medium h-8 px-4 text-sm ${profile.is_following ? 'bg-gray-200 dark:bg-secondary text-gray-600 dark:text-secondary-foreground' : ''}`}>
              {profile.is_following ? t('userProfile.alreadyFollowing', {
            ns: 'common'
          }) : t('userProfile.follow', {
            ns: 'common'
          })}
            </Button>
            {/* Message Button */}
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate('/messages', {
          state: {
            initialUserId: userId
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
              <button onClick={() => openModal('followers')} className="hover:opacity-70 transition-opacity">
                <span className="font-bold">{profile.followers_count || 0}</span>{' '}
                <span className="text-muted-foreground">{t('userProfile.followers', {
                  ns: 'common'
                })}</span>
              </button>
              
              <button onClick={() => openModal('following')} className="hover:opacity-70 transition-opacity">
                <span className="font-bold">{profile.following_count || 0}</span>{' '}
                <span className="text-muted-foreground">{t('userProfile.following', {
                  ns: 'common'
                })}</span>
              </button>
              
              <button onClick={() => setIsLocationsListOpen(true)} className="hover:opacity-70 transition-opacity">
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

      {/* Cities Filter Section */}
      {cities.length > 0 && <div className="px-4 py-2">
          {/* City Pills - Horizontally Scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {cities.map(cityData => {})}
          </div>

          {/* Stats Row with Category Cards */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {/* In Common Card - Only show for other profiles */}
            {!isOwnProfile && <button onClick={() => {/* TODO: Open map with common locations */}} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0">
                <div className="flex -space-x-2">
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarImage src={commonLocations.theirAvatar || undefined} />
                    <AvatarFallback className="text-xs">{profile.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarImage src={commonLocations.myAvatar || undefined} />
                    <AvatarFallback className="text-xs">{currentUser?.email?.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold">{commonLocations.count}</span>
                  <span className="text-xs text-muted-foreground">{t('userProfile.inCommon', {
                ns: 'common'
              })}</span>
                </div>
              </button>}

            {/* All Locations Card */}
            <button onClick={() => navigate('/', {
          state: {
            showMapExpanded: true,
            filterUserId: userId,
            filterCategory: 'all'
          }
        })} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.all}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.allLocations', {
                ns: 'common'
              })}</span>
              </div>
            </button>

            {/* Visited Locations Card */}
            <button onClick={() => navigate('/', {
          state: {
            showMapExpanded: true,
            filterUserId: userId,
            filterCategory: 'been'
          }
        })} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.been}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.visitedLocations', {
                ns: 'common'
              })}</span>
              </div>
            </button>

            {/* To Try Locations Card */}
            <button onClick={() => navigate('/', {
          state: {
            showMapExpanded: true,
            filterUserId: userId,
            filterCategory: 'to-try'
          }
        })} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Bookmark className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.toTry}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.toTryLocations', {
                ns: 'common'
              })}</span>
              </div>
            </button>

            {/* Favourite Locations Card */}
            <button onClick={() => navigate('/', {
          state: {
            showMapExpanded: true,
            filterUserId: userId,
            filterCategory: 'favourite'
          }
        })} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-200/40 dark:bg-slate-800/65 shrink-0">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span className="font-bold">{categoryCounts.favourite}</span>
                </div>
                <span className="text-xs text-muted-foreground">{t('userProfile.favouriteLocations', {
                ns: 'common'
              })}</span>
              </div>
            </button>
          </div>
        </div>}
      
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

      {showBadgesModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-background w-full rounded-t-3xl max-h-[80vh] overflow-hidden">
            <Achievements userId={userId} />
            <div className="p-4">
              <Button onClick={() => setShowBadgesModal(false)} variant="secondary" className="w-full">
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>}
    </div>;
};
export default UserProfilePage;