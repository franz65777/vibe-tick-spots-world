import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStories } from '@/hooks/useStories';
import { Badge } from './ui/badge';
import navHomeIcon from '@/assets/nav-home.png';
import navSearchIcon from '@/assets/nav-search.png';
import navAddIcon from '@/assets/nav-add.png';
import navFeedIcon from '@/assets/nav-feed.png';
import navProfileIcon from '@/assets/nav-profile.png';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { trackEvent } = useAnalytics();
  const { stories } = useStories();
  
  // Check for new stories (posted in last 24 hours)
  const hasNewStories = stories.some(story => {
    const storyDate = new Date(story.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - storyDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  });

  const handleNavClick = (path: string, label: string) => {
    navigate(path);
    trackEvent('nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const navItems = [
    { 
      icon: navHomeIcon, 
      label: 'Home', 
      path: '/',
      hasIndicator: hasNewStories
    },
    { 
      icon: navSearchIcon, 
      label: 'Discover', 
      path: '/explore'
    },
    { 
      icon: navAddIcon, 
      label: 'Add', 
      path: '/add',
      isCenter: true
    },
    { 
      icon: navFeedIcon, 
      label: 'Feed', 
      path: '/feed'
    },
    { 
      icon: navProfileIcon, 
      label: 'Profile', 
      path: '/profile',
      badge: unreadCount
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-t border-gray-100 dark:border-gray-800 z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-screen-xl mx-auto px-4 h-20 flex items-end justify-around pb-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          // Center FAB - elevated and larger
          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path, item.label)}
                className="flex flex-col items-center justify-center transition-all duration-200 active:scale-95 relative group -mt-6"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative w-16 h-16">
                  <img 
                    src={item.icon} 
                    alt={item.label}
                    className="w-full h-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path, item.label)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-2 transition-all duration-200 relative group",
                isActive ? 'scale-105' : 'scale-100',
                "active:scale-95"
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative mb-1">
                <img 
                  src={item.icon} 
                  alt={item.label}
                  className={cn(
                    "w-12 h-12 object-contain transition-all duration-200",
                    isActive ? 'opacity-100' : 'opacity-60'
                  )}
                />
                
                {/* Notification badge - inside icon */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 shadow-lg ring-2 ring-white dark:ring-gray-900">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
                
                {/* New stories indicator */}
                {item.hasIndicator && !isActive && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></span>
                )}
              </div>
              
              <span className={cn(
                "text-xs font-medium transition-all duration-200",
                isActive ? 'text-foreground' : 'text-muted-foreground'
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
