import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Search, Plus, Newspaper, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from './ui/badge';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const navItems = [
    { 
      icon: MapPin, 
      label: 'Map', 
      path: '/',
      fillable: true
    },
    { 
      icon: Search, 
      label: 'Search', 
      path: '/explore',
      fillable: false
    },
    { 
      icon: Plus, 
      label: 'Add', 
      path: '/add',
      isCenter: true,
      fillable: true
    },
    { 
      icon: Newspaper, 
      label: 'Feed', 
      path: '/feed',
      badge: unreadCount,
      fillable: true
    },
    { 
      icon: User, 
      label: 'Profile', 
      path: '/profile',
      fillable: false
    },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-t-3xl shadow-2xl border-t border-gray-200/50 dark:border-gray-700/50 z-50">
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-around safe-area-pb">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          // Center button - smaller, aligned with others
          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center gap-1 py-2 px-4"
                aria-label={item.label}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              aria-label={item.label}
            >
              <Icon 
                className={cn(
                  "w-6 h-6 transition-all duration-200", 
                  isActive && "scale-110"
                )} 
                fill={isActive && item.fillable ? "currentColor" : "none"}
              />
              {isActive && (
                <span className={cn(
                  "text-xs font-medium",
                  "text-blue-600 dark:text-blue-400"
                )}>
                  {item.label}
                </span>
              )}
              {item.badge && item.badge > 0 && (
                <div className="absolute top-1 right-3 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1 animate-pulse">
                  <span className="text-white text-[10px] font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
