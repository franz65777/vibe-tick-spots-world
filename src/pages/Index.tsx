
import { useState } from 'react';
import { MapPin, Search, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import HomePage from '@/components/HomePage';
import ExplorePage from '@/components/ExplorePage';
import ProfilePage from '@/components/ProfilePage';
import AddLocationPage from '@/components/AddLocationPage';

const Index = () => {
  console.log('Index component rendering...');
  
  const [activeTab, setActiveTab] = useState('discover');

  const renderActiveTab = () => {
    console.log('Rendering active tab:', activeTab);
    switch (activeTab) {
      case 'discover':
        return <HomePage />;
      case 'explore':
        return <ExplorePage />;
      case 'add':
        return <AddLocationPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage />;
    }
  };

  console.log('Index component state:', { activeTab });

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

      {/* Bottom Navigation - Clean Design */}
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-4 safe-area-pb">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setActiveTab('discover')}
            className="flex flex-col items-center gap-2 py-2 px-3 transition-all duration-200"
          >
            <MapPin className={cn(
              "w-6 h-6 transition-colors duration-200",
              activeTab === 'discover' ? "text-blue-600" : "text-gray-400"
            )} />
            <span className={cn(
              "text-xs font-medium transition-colors duration-200",
              activeTab === 'discover' ? "text-blue-600" : "text-gray-400"
            )}>Discover</span>
          </button>
          
          <button
            onClick={() => setActiveTab('explore')}
            className="flex flex-col items-center gap-2 py-2 px-3 transition-all duration-200"
          >
            <Search className={cn(
              "w-6 h-6 transition-colors duration-200",
              activeTab === 'explore' ? "text-blue-600" : "text-gray-400"
            )} />
            <span className={cn(
              "text-xs font-medium transition-colors duration-200",
              activeTab === 'explore' ? "text-blue-600" : "text-gray-400"
            )}>Explore</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className="flex flex-col items-center gap-2 py-2 px-3 transition-all duration-200"
          >
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200",
              activeTab === 'add' 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 text-gray-400"
            )}>
              <Plus className="w-4 h-4" />
            </div>
            <span className={cn(
              "text-xs font-medium transition-colors duration-200",
              activeTab === 'add' ? "text-blue-600" : "text-gray-400"
            )}>Add</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className="flex flex-col items-center gap-2 py-2 px-3 transition-all duration-200"
          >
            <User className={cn(
              "w-6 h-6 transition-colors duration-200",
              activeTab === 'profile' ? "text-blue-600" : "text-gray-400"
            )} />
            <span className={cn(
              "text-xs font-medium transition-colors duration-200",
              activeTab === 'profile' ? "text-blue-600" : "text-gray-400"
            )}>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
