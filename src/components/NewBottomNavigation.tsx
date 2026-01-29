import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';
import { Map, Search, Plus, Activity, User } from 'lucide-react';
import { toast } from 'sonner';
import AccountSwitchModal from './AccountSwitchModal';
import { HomeMenuDropdown } from './HomeMenuDropdown';
import { useTranslation } from 'react-i18next';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { haptics } from '@/utils/haptics';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExploreOverlay } from '@/contexts/ExploreOverlayContext';
import { useFeedOverlay } from '@/contexts/FeedOverlayContext';
import { useProfileOverlay } from '@/contexts/ProfileOverlayContext';

const NewBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useOptimizedProfile();
  const { trackEvent } = useAnalytics();
  const { hasValidBusinessAccount } = useBusinessProfile();
  const queryClient = useQueryClient();
  
  // Overlay contexts
  const { openExploreOverlay } = useExploreOverlay();
  const { openFeedOverlay } = useFeedOverlay();
  const { openProfileOverlay } = useProfileOverlay();
  
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const { t } = useTranslation();
  const [hideNav, setHideNav] = useState(false);
  const [longPressActivated, setLongPressActivated] = useState(false);

  useEffect(() => {
    const handleOpen = () => setHideNav(true);
    const handleClose = () => setHideNav(false);
    window.addEventListener('ui:overlay-open', handleOpen as EventListener);
    window.addEventListener('ui:overlay-close', handleClose as EventListener);
    return () => {
      window.removeEventListener('ui:overlay-open', handleOpen as EventListener);
      window.removeEventListener('ui:overlay-close', handleClose as EventListener);
    };
  }, [location.pathname]);

  // Subscribe to profile changes for avatar updates via centralized realtime
  const handleProfileUpdate = useCallback(() => {
    refetchProfile();
  }, [refetchProfile]);
  
  useRealtimeEvent('profile_update', handleProfileUpdate);

  // Determine if navigation should be hidden (CSS-based, keeps component mounted)
  // Note: /messages and /notifications are now overlays, not routes
  const shouldHideNav = hideNav || 
    location.pathname === '/share-location';

  // Prefetch profile data when hovering/focusing on Profile tab
  // This ensures instant loading when user clicks Profile
  const handleProfilePrefetch = useCallback(() => {
    if (user?.id) {
      // Prefetch the aggregated profile data
      queryClient.prefetchQuery({
        queryKey: ['profile-aggregated', user.id],
        queryFn: async () => {
          const [profileRes, followersRes, followingRes, savedLocationsRes, savedPlacesRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
            supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
            supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
            supabase.from('user_saved_locations').select('location_id, save_tag, locations(city)').eq('user_id', user.id),
            supabase.from('saved_places').select('id, city, save_tag').eq('user_id', user.id),
          ]);
          return { profile: profileRes.data, followers: followersRes.count, following: followingRes.count };
        },
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [user?.id, queryClient]);

  const handleNavClick = (path: string, label: string) => {
    haptics.selection();
    navigate(path);
    trackEvent('nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const handleProfileLongPressStart = () => {
    // Only show switch modal if user has a business account
    if (!hasValidBusinessAccount) return;
    
    const timer = setTimeout(() => {
      haptics.impact('heavy');
      setShowSwitchModal(true);
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleProfileLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      // Short tap - open profile overlay
      if (!showSwitchModal) {
        haptics.selection();
        openProfileOverlay();
        trackEvent('nav_tab_clicked', { tab: 'profile' });
      }
    }
  };

  const handleProfileClick = () => {
    // For users without business account, open profile overlay directly
    if (!hasValidBusinessAccount) {
      haptics.selection();
      openProfileOverlay();
      trackEvent('nav_tab_clicked', { tab: 'profile' });
    }
  };

  const handleAccountSwitch = (mode: 'personal' | 'business') => {
    // Note: localStorage only used for UI preference, not authorization
    // Actual authorization is verified server-side via business_profiles table
    localStorage.setItem('accountMode', mode);
    if (mode === 'business') {
      navigate('/business');
      toast.success('Switched to Business Account');
    } else {
      navigate('/profile');
      toast.success('Switched to Personal Account');
    }
  };

  const handleHomeMenuSelect = (option: 'map' | 'share') => {
    trackEvent('home_menu_option_selected', { option });
    switch (option) {
      case 'map':
        navigate('/');
        break;
      case 'share':
        navigate('/share-location');
        break;
    }
  };

  const navItems = [
    { 
      icon: <Map size={24} strokeWidth={2} />, 
      label: t('navigation:explore'), 
      path: '/',
      longPress: true
    },
    { 
      icon: <Search size={24} strokeWidth={2} />, 
      label: t('navigation:search'), 
      path: '/explore',
      customAction: () => {
        haptics.selection();
        openExploreOverlay();
        trackEvent('nav_tab_clicked', { tab: 'search' });
      }
    },
    { 
      icon: <Plus size={24} strokeWidth={2} />, 
      label: t('navigation:add'), 
      path: '/add',
      customAction: () => {
        haptics.impact('medium');
        window.dispatchEvent(new CustomEvent('open-add-overlay'));
      }
    },
    { 
      icon: <Activity size={24} strokeWidth={2} />, 
      label: t('navigation:feed'), 
      path: '/feed',
      customAction: () => {
        haptics.selection();
        openFeedOverlay();
        trackEvent('nav_tab_clicked', { tab: 'feed' });
      }
    },
    { 
      icon: <User size={24} strokeWidth={2} />, 
      label: t('navigation:profile'), 
      path: '/profile',
      customAction: () => {
        haptics.selection();
        openProfileOverlay();
        trackEvent('nav_tab_clicked', { tab: 'profile' });
      }
    },
  ];

  return (
    <>
      <AccountSwitchModal
        open={showSwitchModal}
        onOpenChange={setShowSwitchModal}
        onSwitch={handleAccountSwitch}
        currentMode="personal"
      />
      
      <HomeMenuDropdown
        isOpen={showHomeMenu}
        onClose={() => setShowHomeMenu(false)}
        onSelectOption={handleHomeMenuSelect}
      />
      
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[110] pointer-events-auto transition-all duration-150",
          shouldHideNav && "opacity-0 pointer-events-none translate-y-full"
        )}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={shouldHideNav}
      >
        <div className="w-full px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="relative bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md rounded-3xl mx-2 mb-2 shadow-sm">
            <div className="absolute inset-0 rounded-3xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
            <div className="h-16 flex items-center justify-around px-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isProfileTab = item.path === '/profile';
                const isHomeTab = item.path === '/';
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (isHomeTab) {
                        setShowHomeMenu(!showHomeMenu);
                      } else if (isProfileTab && hasValidBusinessAccount) {
                        // Long press logic handled separately
                        return;
                      } else if ((item as any).customAction) {
                        (item as any).customAction();
                      } else {
                        handleNavClick(item.path, item.label);
                      }
                    }}
                    onMouseEnter={isProfileTab ? handleProfilePrefetch : undefined}
                    onFocus={isProfileTab ? handleProfilePrefetch : undefined}
                    onMouseDown={
                      isProfileTab && hasValidBusinessAccount ? handleProfileLongPressStart : 
                      undefined
                    }
                    onMouseUp={
                      isProfileTab && hasValidBusinessAccount ? handleProfileLongPressEnd : 
                      undefined
                    }
                    onMouseLeave={
                      isProfileTab && hasValidBusinessAccount ? handleProfileLongPressEnd : 
                      undefined
                    }
                    onTouchStart={
                      isProfileTab && hasValidBusinessAccount ? handleProfileLongPressStart : 
                      isProfileTab ? handleProfilePrefetch :
                      undefined
                    }
                    onTouchEnd={
                      isProfileTab && hasValidBusinessAccount ? handleProfileLongPressEnd : 
                      undefined
                    }
                    onTouchCancel={
                      isProfileTab && hasValidBusinessAccount ? handleProfileLongPressEnd : 
                      undefined
                    }
                    className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 transition-colors duration-200"
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isProfileTab ? (
                      <div className={cn(
                        "transition-colors duration-200 flex items-center justify-center",
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={profile?.avatar_url || ''} />
                          <AvatarFallback className={cn(
                            "text-xs font-semibold",
                            isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {profile?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <div className={cn(
                        "transition-colors duration-200",
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {item.icon}
                      </div>
                    )}
                    <span className={cn(
                      "text-[11px] font-medium transition-colors duration-200",
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NewBottomNavigation;
