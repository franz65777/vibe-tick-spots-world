
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import ChatIcon from '@/components/icons/ChatIcon';
import MapFilterDropdown from './MapFilterDropdown';
import { Place } from '@/types/place';

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
  selectedPlace?: Place | null;
  onCloseSelectedPlace?: () => void;
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
  selectedPlace,
  onCloseSelectedPlace,
}: HeaderProps) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Listen for modal open/close via data attribute
  useEffect(() => {
    const checkModalOpen = () => {
      setIsModalOpen(document.body.hasAttribute('data-modal-open'));
    };
    
    checkModalOpen();
    
    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-modal-open'] });
    
    return () => observer.disconnect();
  }, []);

  // Hide header content when search drawer is open or modal is open
  if (isSearchDrawerOpen || isModalOpen) {
    return null;
  }

  // Hide header completely when a place with back button is selected (from posts, folders, etc.)
  // Show location-focused header only when a regular pin is selected (no back navigation context)
  if (selectedPlace) {
    // If place has sourcePostId, returnTo, or fromList, it means there's a back button in PinDetailCard - hide header completely
    const hasBackButton = !!(selectedPlace as any).sourcePostId || 
                          !!(selectedPlace as any).returnTo || 
                          !!(selectedPlace as any).fromList;
    if (hasBackButton) {
      return null;
    }

    return (
      <header className="sticky top-0 z-40">
        <div className="flex items-center justify-between pl-3 pr-2 py-2 gap-2">
          {/* Location search bar - clickable to open search */}
          <button 
            onClick={onOpenSearchOverlay}
            className="flex-1 flex items-center gap-3 h-12 px-4 rounded-full bg-black dark:bg-white/90 backdrop-blur-md border border-border/10 transition-all duration-200 active:scale-[0.98]"
          >
            <span className="text-lg leading-none">📌</span>
            <span className="text-base font-medium text-white dark:text-gray-900 truncate">
              {selectedPlace.name}
            </span>
          </button>

          {/* Close button */}
          <button 
            onClick={onCloseSelectedPlace}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-black/80 dark:bg-white/80 backdrop-blur-md border border-border/30 rounded-full text-white dark:text-gray-900 hover:bg-black/90 dark:hover:bg-white/90 transition-all duration-200 active:scale-95"
            aria-label="Close location"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="flex items-center justify-between pl-[10px] pr-2 py-2 gap-2 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-b-2xl mx-1">
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
