import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Map, Search, Plus, Activity, User } from 'lucide-react';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { toast } from 'sonner';

const NewBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { hasValidBusinessAccount, loading: businessLoading } = useBusinessProfile();
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleNavClick = (path: string, label: string) => {
    navigate(path);
    trackEvent('nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const handleProfileLongPressStart = () => {
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      if (!businessLoading && hasValidBusinessAccount) {
        localStorage.setItem('accountMode', 'business');
        navigate('/business');
        toast.success('Switched to Business Account');
      } else if (!businessLoading) {
        toast.error('No verified business account');
      }
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleProfileLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    // If it was a long press, don't navigate
    if (!isLongPressing) {
      handleNavClick('/profile', 'Profile');
    }
    setIsLongPressing(false);
  };

  const navItems = [
    { 
      icon: <Map size={24} strokeWidth={2} />, 
      label: 'Explore', 
      path: '/'
    },
    { 
      icon: <Search size={24} strokeWidth={2} />, 
      label: 'Search', 
      path: '/explore'
    },
    { 
      icon: <Plus size={24} strokeWidth={2} />, 
      label: 'Add', 
      path: '/add'
    },
    { 
      icon: <Activity size={24} strokeWidth={2} />, 
      label: 'Feed', 
      path: '/feed'
    },
    { 
      icon: <User size={24} strokeWidth={2} />, 
      label: 'Profile', 
      path: '/profile'
    },
  ];

  return (
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
  );
};

export default NewBottomNavigation;
