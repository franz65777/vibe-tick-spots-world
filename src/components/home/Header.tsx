
import React, { useState } from 'react';
import { Bell, Send } from 'lucide-react';
import CityAutocompleteBar from '../common/CityAutocompleteBar';
import MessageHistoryModal from './MessageHistoryModal';
import { useNotifications } from '@/hooks/useNotifications';

interface HeaderProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (query: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
  onCreateStoryClick: () => void;
  onCitySelect: (city: string, coords?: { lat: number; lng: number }) => void;
  onOpenSearchOverlay: () => void;
}

const Header = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onNotificationsClick,
  onMessagesClick,
  onCreateStoryClick,
  onCitySelect
}: HeaderProps) => {
  const [isMessageHistoryOpen, setIsMessageHistoryOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
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
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Notifications Button */}
            <button 
              onClick={onNotificationsClick} 
              className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
            
            {/* Messages Button */}
            <button 
              onClick={onMessagesClick} 
              className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95"
              aria-label="Open messages"
            >
              <div className="relative">
                <Send className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <MessageHistoryModal 
        isOpen={isMessageHistoryOpen} 
        onClose={() => setIsMessageHistoryOpen(false)} 
      />
    </>
  );
};

export default Header;
