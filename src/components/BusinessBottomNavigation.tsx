import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { LayoutGrid, BarChart3, Plus, Activity, User, Bell, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import AccountSwitchModal from './AccountSwitchModal';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

const BusinessBottomNavigation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const { unreadCount: notificationsCount } = useNotifications();
  const { unreadCount: messagesCount } = useUnreadMessages();

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

  if (hideNav) {
    return null;
  }

  const handleNavClick = (path: string, label: string) => {
    navigate(path);
    trackEvent('business_nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const handleProfileLongPressStart = () => {
    const timer = setTimeout(() => {
      setShowSwitchModal(true);
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleProfileLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      // Short tap - navigate to business profile
      if (!showSwitchModal) {
        handleNavClick('/business/profile', 'Profile');
      }
    }
  };

  const handleAccountSwitch = (mode: 'personal' | 'business') => {
    // Note: localStorage only used for UI preference, not authorization
    // Actual authorization is verified server-side via business_profiles table
    localStorage.setItem('accountMode', mode);
    if (mode === 'personal') {
      navigate('/profile');
      toast.success('Switched to Personal Account');
    } else {
      navigate('/business');
      toast.success('Switched to Business Account');
    }
  };

  const navItems = [
    { 
      icon: <LayoutGrid size={24} strokeWidth={2} />, 
      label: t('overview', { ns: 'business' }), 
      path: '/business',
      badge: 0
    },
    { 
      icon: <Bell size={24} strokeWidth={2} />, 
      label: t('navigation:notifications') || 'Notifications', 
      path: '/business/notifications',
      badge: notificationsCount
    },
    { 
      icon: <Plus size={24} strokeWidth={2} />, 
      label: t('add', { ns: 'common' }), 
      path: '/business/add',
      badge: 0
    },
    { 
      icon: <MessageCircle size={24} strokeWidth={2} />, 
      label: t('navigation:messages') || 'Messages', 
      path: '/business/messages',
      badge: messagesCount
    },
    { 
      icon: <User size={24} strokeWidth={2} />, 
      label: t('profile', { ns: 'common' }), 
      path: '/business/profile',
      badge: 0
    },
  ];

  return (
    <>
      <AccountSwitchModal
        open={showSwitchModal}
        onOpenChange={setShowSwitchModal}
        onSwitch={handleAccountSwitch}
        currentMode="business"
      />
      
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[110]"
        role="navigation"
        aria-label="Business navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-screen-sm mx-auto px-3 pb-3">
          <div className="rounded-2xl bg-white shadow-[0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 px-2 h-16 flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isProfileTab = item.path === '/business/profile';
              const showBadge = item.badge && item.badge > 0;
              
              return (
                <button
                  key={item.path}
                  onClick={isProfileTab ? undefined : () => handleNavClick(item.path, item.label)}
                  onMouseDown={isProfileTab ? handleProfileLongPressStart : undefined}
                  onMouseUp={isProfileTab ? handleProfileLongPressEnd : undefined}
                  onMouseLeave={isProfileTab ? handleProfileLongPressEnd : undefined}
                  onTouchStart={isProfileTab ? handleProfileLongPressStart : undefined}
                  onTouchEnd={isProfileTab ? handleProfileLongPressEnd : undefined}
                  className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 transition-colors duration-200 relative"
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className={cn(
                    "transition-colors duration-200 relative",
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {item.icon}
                    {showBadge && (
                      <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-foreground leading-none">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      </div>
                    )}
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

export default BusinessBottomNavigation;
