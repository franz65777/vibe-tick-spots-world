
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import ChatIcon from '@/components/icons/ChatIcon';
import MapFilterDropdown from './MapFilterDropdown';

interface HeaderProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (query: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCreateStoryClick: () => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onOpenSearchOverlay: () => void;
  isCenteredOnUser?: boolean;
  onCenterStatusChange?: (isCentered: boolean) => void;
  isSearchDrawerOpen?: boolean;
}

const Header = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onCreateStoryClick,
  onCitySelect,
  onOpenSearchOverlay,
  isCenteredOnUser = false,
  onCenterStatusChange,
  isSearchDrawerOpen = false,
}: HeaderProps) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();

  // Hide header content when search drawer is open
  if (isSearchDrawerOpen) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="flex items-center justify-between pl-[10px] pr-2 py-2 gap-2">
          {/* Left: Filter Dropdown */}
          <div className="flex-shrink-0">
            <MapFilterDropdown />
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Notifications Button */}
            <button 
              onClick={() => navigate('/notifications')} 
              className="relative w-10 h-10 flex items-center justify-center bg-white/70 dark:bg-black/40 backdrop-blur-md border border-border/30 rounded-full text-foreground hover:bg-white/90 dark:hover:bg-black/60 transition-all duration-200 active:scale-95"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
            
            {/* Messages Button */}
            <button 
              onClick={() => navigate('/messages')} 
              className="relative w-10 h-10 flex items-center justify-center bg-white/70 dark:bg-black/40 backdrop-blur-md border border-border/30 rounded-full text-foreground hover:bg-white/90 dark:hover:bg-black/60 transition-all duration-200 active:scale-95"
              aria-label="Open messages"
            >
              <div className="relative">
                <ChatIcon size={20} />
                {unreadMessagesCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold leading-none">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
