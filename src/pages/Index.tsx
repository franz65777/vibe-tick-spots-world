
import { useState } from 'react';
import { MapPin, Search, User, Heart, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import HomePage from '@/components/HomePage';
import ExplorePage from '@/components/ExplorePage';
import ProfilePage from '@/components/ProfilePage';

const Index = () => {
  const [activeTab, setActiveTab] = useState('discover');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'discover':
        return <HomePage />;
      case 'explore':
        return <ExplorePage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Status Bar Mock */}
      <div className="bg-white px-4 py-2 flex justify-between items-center text-sm font-medium">
        <span>15:20</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-gray-800 rounded-full"></div>
            <div className="w-1 h-3 bg-gray-800 rounded-full"></div>
            <div className="w-1 h-3 bg-gray-800 rounded-full"></div>
            <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
          </div>
          <div className="ml-2 text-xs bg-green-500 text-white px-1 rounded">94%</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderActiveTab()}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setActiveTab('discover')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
              activeTab === 'discover' 
                ? "text-blue-600" 
                : "text-gray-500"
            )}
          >
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium">Discover</span>
          </button>
          
          <button
            onClick={() => setActiveTab('explore')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
              activeTab === 'explore' 
                ? "text-blue-600" 
                : "text-gray-500"
            )}
          >
            <Search className={cn("w-6 h-6", activeTab === 'explore' ? "text-blue-600" : "text-gray-500")} />
            <span className="text-xs font-medium">Explore</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
              activeTab === 'profile' 
                ? "text-blue-600" 
                : "text-gray-500"
            )}
          >
            <User className={cn("w-6 h-6", activeTab === 'profile' ? "text-blue-600" : "text-gray-500")} />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
