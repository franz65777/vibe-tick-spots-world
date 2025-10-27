
import { useState, useEffect } from 'react';
import { Award, MapPin, Grid3X3, Tag, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasNewBadges?: boolean;
  showTrips?: boolean;
  showLocations?: boolean;
  showMarketing?: boolean;
}

const ProfileTabs = ({
  activeTab,
  onTabChange,
  hasNewBadges = false,
  showTrips = true,
  showLocations = true,
  showMarketing = false
}: ProfileTabsProps) => {
  const { t } = useTranslation();
  return (
    <div className="px-4">
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => onTabChange('posts')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === 'posts'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600"
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden sm:inline">{t('profile.posts')}</span>
        </button>
        {showTrips && (
          <button
            onClick={() => onTabChange('trips')}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              activeTab === 'trips'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">{t('profile.trips')}</span>
          </button>
        )}
        {showMarketing && (
          <button
            onClick={() => onTabChange('marketing')}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              activeTab === 'marketing'
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600"
            )}
          >
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">{t('profile.marketing')}</span>
          </button>
        )}
        <button
          onClick={() => onTabChange('badges')}
          className={cn(
            "relative flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === 'badges'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600"
          )}
        >
          <Award className="w-4 h-4" />
          <span className="hidden sm:inline">{t('profile.badges')}</span>
          {hasNewBadges && activeTab !== 'badges' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </button>
        <button
          onClick={() => onTabChange('tagged')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === 'tagged'
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600"
          )}
        >
          <Tag className="w-4 h-4" />
          <span className="hidden sm:inline">{t('profile.tagged')}</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileTabs;
