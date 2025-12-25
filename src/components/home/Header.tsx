
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import CityAutocompleteBar from '../common/CityAutocompleteBar';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import ChatIcon from '@/components/icons/ChatIcon';

interface HeaderProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (query: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCreateStoryClick: () => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onOpenSearchOverlay: () => void;
}

const Header = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onCreateStoryClick,
  onCitySelect,
  onOpenSearchOverlay
}: HeaderProps) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();

  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="flex items-center justify-between pl-[10px] pr-0 py-2 gap-1">
          {/* Left: City Selection - Now with more space */}
          <div className="flex-1 min-w-0">
            <CityAutocompleteBar 
              currentCity={currentCity}
              onCitySelect={onCitySelect}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onSearchKeyPress={onSearchKeyPress}
              onFocusOpen={onOpenSearchOverlay}
            />
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-0 flex-shrink-0 pr-2.5">
            {/* Notifications Button */}
            <button 
              onClick={() => navigate('/notifications')} 
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all duration-200 active:scale-95"
            >
              <div className="relative">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
            
            {/* Messages Button */}
            <button 
              onClick={() => navigate('/messages')} 
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all duration-200 active:scale-95"
              aria-label="Open messages"
            >
              <div className="relative">
                <ChatIcon size={24} />
                {unreadMessagesCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold leading-none">
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
