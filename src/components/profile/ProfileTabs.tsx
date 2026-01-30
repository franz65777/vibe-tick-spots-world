
import { useState, useEffect } from 'react';
import { Award, List, Grid3X3, Tag, Megaphone } from 'lucide-react';
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
    <div className="px-3 mb-4">
      <div className="flex bg-gray-100/60 dark:bg-slate-800/50 backdrop-blur-md rounded-xl p-0.5 shadow-inner border border-gray-200/50 dark:border-white/5">
        <button
          onClick={() => onTabChange('posts')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5",
            activeTab === 'posts'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden sm:inline">{t('posts', { ns: 'profile' })}</span>
        </button>
        {showTrips && (
          <button
            onClick={() => onTabChange('trips')}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5",
              activeTab === 'trips'
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
                : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
            )}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{t('trips', { ns: 'profile' })}</span>
          </button>
        )}
        {showMarketing && (
          <button
            onClick={() => onTabChange('marketing')}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5",
              activeTab === 'marketing'
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
                : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
            )}
          >
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">{t('marketing', { ns: 'profile' })}</span>
          </button>
        )}
        <button
          onClick={() => onTabChange('badges')}
          className={cn(
            "relative flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5",
            activeTab === 'badges'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
          )}
        >
          <Award className="w-4 h-4" />
          <span className="hidden sm:inline">{t('badges', { ns: 'profile' })}</span>
          {hasNewBadges && activeTab !== 'badges' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </button>
        <button
          onClick={() => onTabChange('tagged')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5",
            activeTab === 'tagged'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
          )}
        >
          <Tag className="w-4 h-4" />
          <span className="hidden sm:inline">{t('tagged', { ns: 'profile' })}</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileTabs;
