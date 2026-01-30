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

const NewBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useOptimizedProfile();
  const { trackEvent } = useAnalytics();
  const { hasValidBusinessAccount } = useBusinessProfile();
  const queryClient = useQueryClient();
  
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
  const handleProfilePrefetch = useCallback(() => {
    if (user?.id) {
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
    if (!hasValidBusinessAccount) return;
    
    const timer = setTimeout(() => {
      haptics.impact('heavy');
      setShowSwitchModal(true);
      setLongPressActivated(true);
    }, 800);
    setLongPressTimer(timer);
  };

  const handleProfileLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      if (!showSwitchModal && !longPressActivated) {
        haptics.selection();
        navigate('/profile');
        trackEvent('nav_tab_clicked', { tab: 'profile' });
      }
      setLongPressActivated(false);
    }
  };

  const handleProfileClick = () => {
    if (!hasValidBusinessAccount) {
      haptics.selection();
      navigate('/profile');
      trackEvent('nav_tab_clicked', { tab: 'profile' });
    }
  };

  const handleAccountSwitch = (mode: 'personal' | 'business') => {
    haptics.success();
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
    haptics.selection();
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
      icon: Map, 
      label: t('navigation:explore'), 
      path: '/',
      longPress: true
    },
    { 
      icon: Search, 
      label: t('navigation:search'), 
      path: '/explore'
    },
    { 
      icon: Plus, 
      label: t('navigation:add'), 
      path: '/add',
      customAction: () => {
        haptics.impact('medium');
        window.dispatchEvent(new CustomEvent('open-add-overlay'));
      }
    },
    { 
      icon: Activity, 
      label: t('navigation:feed'), 
      path: '/feed'
    },
    { 
      icon: User, 
      label: t('navigation:profile'), 
      path: '/profile'
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
        <div className="w-full px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="relative bg-white dark:bg-zinc-900 rounded-full mx-4 mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] overflow-hidden">
            {/* Gradient blue accent in corner */}
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-gradient-to-br from-blue-400/30 via-blue-500/20 to-transparent rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-tl from-primary/20 via-blue-400/10 to-transparent rounded-full blur-lg pointer-events-none" />
            <div className="relative h-[52px] flex items-center justify-around px-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isProfileTab = item.path === '/profile';
                const isHomeTab = item.path === '/';
                const IconComponent = item.icon;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (isHomeTab) {
                        haptics.impact('light');
                        setShowHomeMenu(!showHomeMenu);
                      } else if (isProfileTab && hasValidBusinessAccount) {
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
                    className={cn(
                      "flex items-center justify-center min-w-[48px] transition-all duration-200 active:scale-95"
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isProfileTab ? (
                      <div className={cn(
                        "p-1.5 rounded-full transition-all duration-200",
                        isActive && "bg-primary/10 scale-105"
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
                        "p-1.5 rounded-full transition-all duration-200",
                        isActive && "bg-primary/10 scale-105"
                      )}>
                        <IconComponent 
                          size={26} 
                          strokeWidth={isActive ? 2.5 : 2}
                          className={cn(
                            "transition-colors duration-200",
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                    )}
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
