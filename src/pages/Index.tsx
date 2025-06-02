
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

      {/* Bottom Navigation - Redesigned */}
      <div className="bg-white/90 backdrop-blur-lg border-t border-gray-100 px-4 py-3 safe-area-pb">
        <div className="bg-gray-100/80 rounded-2xl p-2 flex justify-between items-center relative">
          {/* Active indicator background */}
          <div 
            className={cn(
              "absolute top-2 bottom-2 bg-white rounded-xl shadow-sm transition-all duration-300 ease-out",
              activeTab === 'discover' && "left-2 right-[75%]",
              activeTab === 'explore' && "left-[25%] right-[50%]",
              activeTab === 'add' && "left-[50%] right-[25%]",
              activeTab === 'profile' && "left-[75%] right-2"
            )}
          />
          
          <button
            onClick={() => setActiveTab('discover')}
            className={cn(
              "relative z-10 flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-all duration-200",
              activeTab === 'discover' 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <MapPin className={cn(
              "w-5 h-5 transition-all duration-200",
              activeTab === 'discover' && "scale-110"
            )} />
            <span className="text-xs font-medium">Discover</span>
          </button>
          
          <button
            onClick={() => setActiveTab('explore')}
            className={cn(
              "relative z-10 flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-all duration-200",
              activeTab === 'explore' 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Search className={cn(
              "w-5 h-5 transition-all duration-200",
              activeTab === 'explore' && "scale-110"
            )} />
            <span className="text-xs font-medium">Explore</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={cn(
              "relative z-10 flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-all duration-200",
              activeTab === 'add' 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200",
              activeTab === 'add' 
                ? "bg-blue-600 text-white scale-110" 
                : "bg-gray-300 text-gray-600"
            )}>
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium">Add</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "relative z-10 flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-all duration-200",
              activeTab === 'profile' 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <User className={cn(
              "w-5 h-5 transition-all duration-200",
              activeTab === 'profile' && "scale-110"
            )} />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
