
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const WorldWithPinsIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {/* World circle */}
      <circle cx="12" cy="12" r="10"/>
      {/* Continents outline */}
      <path d="M8 3c1 0 2 1 3 1s2-1 3-1"/>
      <path d="M8 21c1 0 2-1 3-1s2 1 3 1"/>
      <path d="M3 8c0 1 1 2 1 3s-1 2-1 3"/>
      <path d="M21 8c0 1-1 2-1 3s1 2 1 3"/>
      {/* Map pins */}
      <circle cx="9" cy="8" r="1" fill="currentColor"/>
      <path d="M9 7v2" strokeWidth="1"/>
      <circle cx="15" cy="14" r="1" fill="currentColor"/>
      <path d="M15 13v2" strokeWidth="1"/>
      <circle cx="7" cy="16" r="1" fill="currentColor"/>
      <path d="M7 15v2" strokeWidth="1"/>
    </svg>
  );

  const navItems = [
    { 
      icon: WorldWithPinsIcon, 
      label: 'Explore', 
      path: '/' 
    },
    { icon: Search, label: 'Search', path: '/explore' },
    { icon: Plus, label: 'Add', path: '/add' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-4 py-2 z-50 shadow-lg">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 min-h-[56px] min-w-[56px]",
                isActive 
                  ? "text-blue-600 bg-blue-50 shadow-md scale-105" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className={cn(
                "w-6 h-6 mb-1 transition-transform", 
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
