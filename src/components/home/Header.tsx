
import { Bell, MessageCircle } from 'lucide-react';
import CitySearch from './CitySearch';
import { useState } from 'react';

interface HeaderProps {
  onCitySelect: (city: string) => void;
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
  onCreateStoryClick: () => void;
}

const Header = ({
  onCitySelect,
  onNotificationsClick,
  onMessagesClick,
  onCreateStoryClick
}: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('San Francisco');

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    onCitySelect(city);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Handle search
      console.log('Search for:', searchQuery);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-lg px-4 py-4 sm:px-6 sm:py-3 shadow-sm relative z-50">
      <div className="flex items-center justify-between gap-4">
        <CitySearch
          searchQuery={searchQuery}
          currentCity={currentCity}
          onSearchChange={setSearchQuery}
          onSearchKeyPress={handleSearchKeyPress}
          onCitySelect={handleCitySelect}
        />
        
        <div className="flex items-center gap-4 sm:gap-3">
          <button
            onClick={onNotificationsClick}
            className="relative w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-orange-500/25"
          >
            <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-5 sm:h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg animate-pulse">
              5
            </div>
          </button>
          <button
            onClick={onMessagesClick}
            className="relative w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/25"
          >
            <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-5 sm:h-5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              3
            </div>
          </button>
          <button
            onClick={onCreateStoryClick}
            className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            <span className="text-white font-bold text-lg sm:text-base">+</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
