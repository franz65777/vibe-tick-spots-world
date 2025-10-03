import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStories } from '@/hooks/useStories';
import { Badge } from './ui/badge';
import { Home, Search, PlusCircle, Activity, User } from 'lucide-react';

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
      icon: PlusCircle, 
      label: '', 
      path: '/add',
      isCenter: true
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
      className="fixed bottom-0 left-0 right-0 z-50"
      role="navigation"
      aria-label="Main navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Glassy background with blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
      
      <div className="relative max-w-screen-xl mx-auto px-6 h-[72px] flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          // Center FAB - modern elevated button
          if (item.isCenter) {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path, item.label)}
                className="relative -mt-8"
                aria-label="Add"
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200">
                  <Icon className="w-8 h-8 text-primary-foreground" strokeWidth={2.5} />
                  
                  {/* Subtle ring effect */}
                  <div className="absolute inset-0 rounded-full ring-4 ring-background" />
                </div>
              </button>
            );
          }
          
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path, item.label)}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 transition-all duration-200 active:scale-95 relative"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-colors duration-200",
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
                
                {/* Notification badge */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              
              <span className={cn(
                "text-[11px] font-medium transition-colors duration-200",
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
