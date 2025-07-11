
import React, { useState } from 'react';
import { Bell, MessageSquare, BellRing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import GlobalCitySearch from './GlobalCitySearch';
import MessageHistoryModal from './MessageHistoryModal';
import SuperUserBadge from '../SuperUserBadge';
import { useNotifications } from '@/hooks/useNotifications';

interface HeaderProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (query: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
  onCreateStoryClick: () => void;
  onCitySelect: (city: string) => void;
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
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: City Selection */}
          <GlobalCitySearch 
            currentCity={currentCity} 
            onCitySelect={onCitySelect} 
            searchQuery={searchQuery} 
            onSearchChange={onSearchChange} 
            onSearchKeyPress={onSearchKeyPress} 
          />

          {/* Center: Super User Badge */}
          <div className="flex-1 flex justify-center">
            <SuperUserBadge />
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1">
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
            >
              <div className="relative">
                <MessageSquare className="w-5 h-5" />
                {/* Message badge can be added here when we have unread message count */}
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
