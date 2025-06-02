
import { Bell, MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  searchQuery: string;
  currentCity: string;
  onSearchChange: (value: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent) => void;
  onNotificationsClick: () => void;
  onMessagesClick: () => void;
}

const Header = ({
  searchQuery,
  currentCity,
  onSearchChange,
  onSearchKeyPress,
  onNotificationsClick,
  onMessagesClick
}: HeaderProps) => {
  return (
    <div className="bg-white/95 backdrop-blur-lg px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Discover
          </h1>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={`Search for cities... (currently in ${currentCity})`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              className="pl-10 bg-white/80 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNotificationsClick}
            className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Bell className="w-5 h-5 text-white" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              3
            </div>
          </button>
          <button
            onClick={onMessagesClick}
            className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            <MessageCircle className="w-5 h-5 text-white" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              2
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
