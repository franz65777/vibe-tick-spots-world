import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { LayoutGrid, BarChart3, Plus, Activity, User } from 'lucide-react';
import { toast } from 'sonner';

const BusinessBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();

  const handleNavClick = (path: string, label: string) => {
    navigate(path);
    trackEvent('business_nav_tab_clicked', { tab: label.toLowerCase() });
  };

  const handleSwitchToPersonal = () => {
    localStorage.setItem('accountMode', 'personal');
    navigate('/profile');
    toast.success('Switched to Personal Account');
  };

  const navItems = [
    { 
      icon: <LayoutGrid size={24} strokeWidth={2} />, 
      label: 'Overview', 
      path: '/business'
    },
    { 
      icon: <BarChart3 size={24} strokeWidth={2} />, 
      label: 'Analytics', 
      path: '/business/analytics'
    },
    { 
      icon: <Plus size={24} strokeWidth={2} />, 
      label: 'Add', 
      path: '/business/add'
    },
    { 
      icon: <Activity size={24} strokeWidth={2} />, 
      label: 'Feed', 
      path: '/business/feed'
    },
    { 
      icon: <User size={24} strokeWidth={2} />, 
      label: 'Profile', 
      path: '/business/profile'
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[110]"
      role="navigation"
      aria-label="Business navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-screen-sm mx-auto px-3 pb-3">
        <div className="rounded-2xl bg-white shadow-[0_8px_16px_rgba(0,0,0,0.08)] border border-gray-100 px-2 h-16 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path, item.label)}
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

export default BusinessBottomNavigation;
