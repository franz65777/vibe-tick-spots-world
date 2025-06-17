
import React, { useState } from 'react';
import { Bell, MessageSquare, Search, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: City Selection */}
          <CitySearch 
            currentCity={currentCity}
            onCitySelect={onCitySelect}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSearchKeyPress={onSearchKeyPress}
          />

          {/* Center: Search */}
          <div className="flex-1 max-w-sm mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search places..."
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value || '')}
                onKeyPress={onSearchKeyPress}
                className="pl-10 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMessageHistoryOpen(true)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              title="Message History"
            >
              <History className="w-5 h-5" />
            </button>
            
            <button
              onClick={onNotificationsClick}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge can be added here */}
            </button>
            
            <button
              onClick={onMessagesClick}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              {/* Message badge can be added here */}
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
