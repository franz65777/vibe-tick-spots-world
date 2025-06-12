
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
        
        <div className="flex items-center gap-3">
          <button
            onClick={onNotificationsClick}
            className="relative w-9 h-9 bg-orange-100 hover:bg-orange-200 rounded-lg flex items-center justify-center transition-colors duration-200"
          >
            <Bell className="w-4 h-4 text-orange-600" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              5
            </div>
          </button>
          <button
            onClick={onMessagesClick}
            className="relative w-9 h-9 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors duration-200"
          >
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              3
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
