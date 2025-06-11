
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
            <svg className="w-5 h-5 sm:w-4 sm:h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1.5-2s-1.5.62-1.5 2a2.5 2.5 0 0 0 2.5 2.5z"/>
              <path d="M12 6V4a2 2 0 0 1 4 0v2"/>
              <path d="M3 11v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/>
              <path d="M12 16v2a2 2 0 0 1-4 0v-2"/>
            </svg>
            <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-5 sm:h-5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              3
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
