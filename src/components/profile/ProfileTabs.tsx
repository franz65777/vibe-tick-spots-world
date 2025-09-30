
import { useState, useEffect } from 'react';
import { Award, MapPin, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasNewBadges?: boolean;
}

const ProfileTabs = ({ activeTab, onTabChange, hasNewBadges = false }: ProfileTabsProps) => {
  return (
    <div className="px-4">
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => onTabChange('posts')}
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
        <button
          onClick={() => onTabChange('trips')}
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
          onClick={() => onTabChange('badges')}
          className={cn(
            "relative flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'badges'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600"
          )}
        >
          <Award className="w-4 h-4" />
          Badges
          {hasNewBadges && activeTab !== 'badges' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfileTabs;
