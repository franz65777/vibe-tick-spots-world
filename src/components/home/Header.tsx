
import { Bell, MessageCircle } from 'lucide-react';
import CitySearch from './CitySearch';

interface HeaderProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
  onCitySelect?: (city: string) => void;
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
  return (
    <div className="bg-white/95 backdrop-blur-lg px-4 py-4 sm:px-6 sm:py-3 shadow-sm relative z-50">
      <div className="flex items-center justify-between gap-4">
        <CitySearch
          searchQuery={searchQuery}
          currentCity={currentCity}
          onSearchChange={onSearchChange}
          onSearchKeyPress={onSearchKeyPress}
          onCitySelect={onCitySelect || (() => {})}
        />
        
        <div className="flex items-center gap-4 sm:gap-3">
          <button
            onClick={onNotificationsClick}
            className="relative w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-5 sm:h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              3
            </div>
          </button>
          <button
            onClick={onMessagesClick}
            className="relative w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-5 sm:h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              2
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
