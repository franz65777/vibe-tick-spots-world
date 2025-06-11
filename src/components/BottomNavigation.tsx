
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, User, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      icon: Globe, 
      label: 'Discover', 
      path: '/' 
    },
    { icon: Search, label: 'Search', path: '/explore' },
    { icon: Plus, label: 'Add', path: '/add' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 z-50 shadow-lg">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-full transition-all duration-150 min-h-[52px] min-w-[52px]",
                isActive 
                  ? "text-blue-600 bg-blue-50 border border-blue-200 scale-105" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mb-1 transition-all duration-150", 
                isActive && "text-blue-600 scale-110"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "text-blue-600"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
