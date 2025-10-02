import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Bookmark, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStories } from '@/hooks/useStories';
import { Badge } from './ui/badge';

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
      label: 'Home', 
      path: '/',
      fillable: true,
      hasIndicator: hasNewStories
    },
    { 
      icon: Search, 
      label: 'Explore', 
      path: '/explore',
      fillable: false
    },
    { 
      icon: PlusCircle, 
      label: 'Add', 
      path: '/add',
      isCenter: true,
      fillable: false
    },
    { 
      icon: Bookmark, 
      label: 'Saved', 
      path: '/saved',
      fillable: true
    },
    { 
      icon: UserCircle, 
      label: 'Profile', 
      path: '/profile',
      fillable: true,
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
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          // Center FAB - elevated and larger
          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path, item.label)}
                className="flex flex-col items-center justify-center transition-all duration-200 active:scale-95 relative group -mt-8"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0E7C86] to-[#0a5d64] rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-[0_8px_30px_rgba(14,124,134,0.4)] group-hover:scale-105 transition-all duration-300 ring-4 ring-white dark:ring-gray-900">
                    <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  {/* Pulse effect */}
                  <div className="absolute inset-0 rounded-full bg-[#0E7C86] opacity-20 animate-[ping_2s_ease-in-out_infinite]"></div>
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
                <Icon 
                  className={cn(
                    "w-7 h-7 transition-all duration-200",
                    isActive ? 'text-[#0E7C86] dark:text-[#10a8b5]' : 'text-[#64748B] dark:text-gray-400'
                  )}
                  fill={isActive && item.fillable ? "currentColor" : "none"}
                  strokeWidth={isActive ? 2.5 : 2}
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
                isActive ? 'text-[#0E7C86] dark:text-[#10a8b5]' : 'text-[#64748B] dark:text-gray-400'
              )}>
                {item.label}
              </span>
              
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#0E7C86] dark:bg-[#10a8b5] rounded-full animate-fade-in"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
