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

    // Subscribe to location changes
    const channel = supabase
      .channel('business-avatar-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'locations',
        },
        () => {
          fetchBusinessAvatar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    navigate(path);
    trackEvent('business_nav_tab_clicked', { tab: label.toLowerCase() });
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
      path: '/business'
    },
    { 
      icon: <BarChart3 size={24} strokeWidth={2} />, 
      label: t('analytics', { ns: 'business' }), 
      path: '/business/analytics'
    },
    { 
      icon: <Plus size={24} strokeWidth={2} />, 
      label: t('add', { ns: 'common' }), 
      path: '/business/add'
    },
    { 
      icon: <Activity size={24} strokeWidth={2} />, 
      label: t('feed', { ns: 'common' }), 
      path: '/business/feed'
    },
    { 
      icon: businessAvatar ? (
        <Avatar className="w-6 h-6">
          <AvatarImage src={businessAvatar} alt="Business" />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            <User size={14} />
          </AvatarFallback>
        </Avatar>
      ) : (
        <User size={24} strokeWidth={2} />
      ),
      label: t('profile', { ns: 'common' }), 
      path: '/business/profile'
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
        className="fixed bottom-0 left-0 right-0 z-[110] safe-area-pb"
        role="navigation"
        aria-label="Business navigation"
      >
        <div className="w-full px-0 bg-muted/10 backdrop-blur-md border-t border-border/10">
          <div className="h-16 flex items-center justify-around px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isProfileTab = item.path === '/business/profile';
              
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

export default BusinessBottomNavigation;
