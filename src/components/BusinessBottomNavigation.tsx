import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { LayoutGrid, BarChart3, Plus, Activity, User } from 'lucide-react';
import { toast } from 'sonner';
import AccountSwitchModal from './AccountSwitchModal';
import { useTranslation } from 'react-i18next';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { haptics } from '@/utils/haptics';

const BusinessBottomNavigation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { hasValidBusinessAccount } = useBusinessProfile();
  const { user } = useAuth();
  
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [businessAvatar, setBusinessAvatar] = useState<string | null>(null);
  const [longPressActivated, setLongPressActivated] = useState(false);

  useEffect(() => {
    const fetchBusinessAvatar = async () => {
      if (!user?.id) return;
      
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('location_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (businessProfile?.location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('image_url')
          .eq('id', businessProfile.location_id)
          .maybeSingle();
        
        if (locationData?.image_url) {
          setBusinessAvatar(locationData.image_url);
        }
      }
    };
    
    fetchBusinessAvatar();
    const interval = setInterval(fetchBusinessAvatar, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

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
    haptics.selection();
    navigate(path);
    trackEvent('business_nav_tab_clicked', { tab: label.toLowerCase() });
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
        handleNavClick('/business/profile', 'Profile');
      }
      setLongPressActivated(false);
    }
  };

  const handleAccountSwitch = (mode: 'personal' | 'business') => {
    haptics.success();
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
      icon: LayoutGrid, 
      label: t('overview', { ns: 'business' }), 
      path: '/business'
    },
    { 
      icon: BarChart3, 
      label: t('analytics', { ns: 'business' }), 
      path: '/business/analytics'
    },
    { 
      icon: Plus, 
      label: t('add', { ns: 'common' }), 
      path: '/business/add',
      customAction: () => {
        haptics.impact('medium');
        navigate('/business/add');
        trackEvent('business_nav_tab_clicked', { tab: 'add' });
      }
    },
    { 
      icon: Activity, 
      label: t('feed', { ns: 'common' }), 
      path: '/business/feed'
    },
    { 
      icon: User, 
      label: t('profile', { ns: 'common' }), 
      path: '/business/profile',
      avatar: businessAvatar
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
      >
        <div className="w-full px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="relative bg-white dark:bg-zinc-900 rounded-[28px] mx-2 mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)]">
            <div className="h-[60px] flex items-center justify-around px-3">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isProfileTab = item.path === '/business/profile';
                const IconComponent = item.icon;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (isProfileTab) {
                        return;
                      } else if ((item as any).customAction) {
                        (item as any).customAction();
                      } else {
                        handleNavClick(item.path, item.label);
                      }
                    }}
                    onMouseDown={isProfileTab ? handleProfileLongPressStart : undefined}
                    onMouseUp={isProfileTab ? handleProfileLongPressEnd : undefined}
                    onMouseLeave={isProfileTab ? handleProfileLongPressEnd : undefined}
                    onTouchStart={isProfileTab ? handleProfileLongPressStart : undefined}
                    onTouchEnd={isProfileTab ? handleProfileLongPressEnd : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1.5 transition-all duration-200 active:scale-95"
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isProfileTab ? (
                      <div className={cn(
                        "p-1.5 rounded-full transition-all duration-200",
                        isActive && "bg-primary/10 scale-105"
                      )}>
                        {(item as any).avatar ? (
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={(item as any).avatar} alt="Business" />
                            <AvatarFallback className={cn(
                              "text-xs font-semibold",
                              isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            )}>
                              <User size={14} />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <IconComponent 
                            size={26} 
                            strokeWidth={isActive ? 2.5 : 2}
                            className={cn(
                              "transition-colors duration-200",
                              isActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                        )}
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
                    <span className={cn(
                      "text-[10px] font-medium transition-colors duration-200",
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

export default BusinessBottomNavigation;
