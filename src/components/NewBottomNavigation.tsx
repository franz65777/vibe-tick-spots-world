import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Map, Search, Plus, Activity, User } from 'lucide-react';
import { toast } from 'sonner';
import AccountSwitchModal from './AccountSwitchModal';
import { useTranslation } from 'react-i18next';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

const NewBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { hasValidBusinessAccount } = useBusinessProfile();
  
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const { t } = useTranslation();
  const [hideNav, setHideNav] = useState(false);

  useEffect(() => {
    const handleOpen = () => setHideNav(true);
    const handleClose = () => setHideNav(false);
    window.addEventListener('ui:overlay-open', handleOpen as EventListener);
    window.addEventListener('ui:overlay-close', handleClose as EventListener);
    return () => {
      window.removeEventListener('ui:overlay-open', handleOpen as EventListener);
      window.removeEventListener('ui:overlay-close', handleClose as EventListener);
    };
  }, []);

  // Hide navigation on messages and notifications pages, or when overlays are open
  if (hideNav || location.pathname === '/messages' || location.pathname === '/notifications') {
    return null;
  }

  const handleNavClick = (path: string, label: string) => {
    navigate(path);
    trackEvent('nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const handleProfileLongPressStart = () => {
    const timer = setTimeout(() => {
      if (hasValidBusinessAccount) {
        setShowSwitchModal(true);
      } else {
        // Navigate to settings for business account request
        navigate('/settings');
        toast.info(t('request_business_account', { ns: 'common', defaultValue: 'Request a business account from Settings' }));
      }
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

  const navItems = [
    { 
      icon: <Map size={24} strokeWidth={2} />, 
      label: t('navigation:explore'), 
      path: '/'
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
      
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[110]"
        role="navigation"
        aria-label="Main navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-screen-sm mx-auto px-3 pb-3">
          <div className="rounded-2xl bg-white shadow-[0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 px-2 h-16 flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isProfileTab = item.path === '/profile';
              
              return (
                <button
                  key={item.path}
                  onClick={isProfileTab ? undefined : () => handleNavClick(item.path, item.label)}
                  onMouseDown={isProfileTab ? handleProfileLongPressStart : undefined}
                  onMouseUp={isProfileTab ? handleProfileLongPressEnd : undefined}
                  onMouseLeave={isProfileTab ? handleProfileLongPressEnd : undefined}
                  onTouchStart={isProfileTab ? handleProfileLongPressStart : undefined}
                  onTouchEnd={isProfileTab ? handleProfileLongPressEnd : undefined}
                  className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 transition-colors duration-200"
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className={cn(
                    "transition-colors duration-200",
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {item.icon}
                  </div>
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
      </nav>
    </>
  );
};

export default NewBottomNavigation;
