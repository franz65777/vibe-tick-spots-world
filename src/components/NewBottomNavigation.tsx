import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Map, Search, Plus, Activity, User } from 'lucide-react';
import { toast } from 'sonner';
import AccountSwitchModal from './AccountSwitchModal';
import { HomeMenuDropdown } from './HomeMenuDropdown';
import { useTranslation } from 'react-i18next';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const NewBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useOptimizedProfile();
  const { trackEvent } = useAnalytics();
  const { hasValidBusinessAccount } = useBusinessProfile();
  
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

  // Subscribe to profile changes for avatar updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-avatar-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          refetchProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchProfile]);

  // Hide navigation on messages and notifications pages, or when overlays are open
  if (hideNav || location.pathname === '/messages' || location.pathname === '/notifications') {
    return null;
  }

  const handleNavClick = (path: string, label: string) => {
    navigate(path);
    trackEvent('nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const handleProfileLongPressStart = () => {
    // Only show switch modal if user has a business account
    if (!hasValidBusinessAccount) return;
    
    const timer = setTimeout(() => {
      setShowSwitchModal(true);
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleProfileLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      // Short tap - navigate to profile
      if (!showSwitchModal) {
        handleNavClick('/profile', 'Profile');
      }
    }
  };

  const handleProfileClick = () => {
    // For users without business account, navigate directly
    if (!hasValidBusinessAccount) {
      navigate('/profile');
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
      path: '/explore'
    },
    { 
      icon: <Plus size={24} strokeWidth={2} />, 
      label: t('navigation:add'), 
      path: '/add'
    },
    { 
      icon: <Activity size={24} strokeWidth={2} />, 
      label: t('navigation:feed'), 
      path: '/feed'
    },
    { 
      icon: <User size={24} strokeWidth={2} />, 
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
        className="fixed bottom-0 left-0 right-0 z-[110]"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="w-full px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-background/20 backdrop-blur-md rounded-3xl mx-2 mb-2 shadow-sm border-[1.5px] border-transparent
            [background-image:linear-gradient(hsl(var(--background)/0.2),hsl(var(--background)/0.2)),linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))]
            [background-origin:border-box] [background-clip:padding-box,border-box]">
            <div className="h-16 flex items-center justify-around px-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isProfileTab = item.path === '/profile';
                const isHomeTab = item.path === '/';
                
                return (
                  <button
                    key={item.path}
                    onClick={
                      isHomeTab ? () => setShowHomeMenu(!showHomeMenu) :
                      isProfileTab && !hasValidBusinessAccount ? handleProfileClick : 
                      isProfileTab ? undefined : 
                      () => handleNavClick(item.path, item.label)
                    }
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
