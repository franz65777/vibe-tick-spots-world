
import React, { useState } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import CitySearch from './CitySearch';
import MessageHistoryModal from './MessageHistoryModal';

interface HeaderProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (query: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
  onCitySelect: (city: string) => void;
}

const Header = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onNotificationsClick,
  onMessagesClick,
  onCitySelect
}: HeaderProps) => {
  const [isMessageHistoryOpen, setIsMessageHistoryOpen] = useState(false);

  return <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: City Selection */}
          <CitySearch currentCity={currentCity} onCitySelect={onCitySelect} searchQuery={searchQuery} onSearchChange={onSearchChange} onSearchKeyPress={onSearchKeyPress} />

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button onClick={onNotificationsClick} className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              {/* Notification badge can be added here */}
            </button>
            
            <button onClick={onMessagesClick} className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
              <MessageSquare className="w-5 h-5" />
              {/* Message badge can be added here */}
            </button>
          </div>
        </div>
      </header>

      <MessageHistoryModal isOpen={isMessageHistoryOpen} onClose={() => setIsMessageHistoryOpen(false)} />
    </>;
};

export default Header;
