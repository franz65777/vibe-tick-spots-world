import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapIcon, Search, PlusCircle, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from './ui/badge';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const navItems = [
    { 
      icon: MapIcon, 
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
      icon: PlusCircle, 
      label: 'Add', 
      path: '/add',
      isCenter: true,
      fillable: true
    },
    { 
      icon: MessageSquare, 
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
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 via-white/80 to-white/60 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-900/60 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 z-50">
      <div className="px-6 py-2">
        <div className="flex justify-around items-end max-w-md mx-auto relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          // Floating Action Button for center item
          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center z-10"
                aria-label={item.label}
              >
                <Icon className="w-8 h-8" fill="currentColor" />
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-300 relative",
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              aria-label={item.label}
            >
              {item.badge && item.badge > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </Badge>
              )}
              <Icon 
                className={cn(
                  "w-6 h-6 transition-all duration-300", 
                  isActive && "scale-110"
                )} 
                fill={isActive && item.fillable ? "currentColor" : "none"}
              />
              <span className={cn(
                "text-[10px] font-medium mt-1",
                isActive && "font-bold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
};

export default BottomNavigation;
