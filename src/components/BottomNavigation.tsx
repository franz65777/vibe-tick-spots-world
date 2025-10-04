import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Home, Search, Plus, Activity, User } from 'lucide-react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { trackEvent } = useAnalytics();

  const handleNavClick = (path: string, label: string) => {
    navigate(path);
    trackEvent('nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const navItems = [
    { 
      icon: Home, 
      label: 'Explore', 
      path: '/'
    },
    { 
      icon: Search, 
      label: 'Search', 
      path: '/explore'
    },
    { 
      icon: Plus, 
      label: 'Add', 
      path: '/add'
    },
    { 
      icon: Activity, 
      label: 'Feed', 
      path: '/feed'
    },
    { 
      icon: User, 
      label: 'Profile', 
      path: '/profile',
      badge: unreadCount
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border"
      role="navigation"
      aria-label="Main navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path, item.label)}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 transition-colors duration-200 relative"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-colors duration-200",
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                  strokeWidth={2}
                />
                
                {/* Notification badge */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
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
    </nav>
  );
};

export default BottomNavigation;
