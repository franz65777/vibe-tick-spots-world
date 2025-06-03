
import { useState } from 'react';
import { Bookmark, MapPin, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProfileTabs = () => {
  const [activeTab, setActiveTab] = useState('saved');

  return (
    <div className="px-4">
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveTab('saved')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'saved'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600"
          )}
        >
          <Bookmark className="w-4 h-4" />
          Saved
        </button>
        <button
          onClick={() => setActiveTab('trips')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'trips'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600"
          )}
        >
          <MapPin className="w-4 h-4" />
          Trips
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'posts'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600"
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          Posts
        </button>
      </div>
    </div>
  );
};

export default ProfileTabs;
