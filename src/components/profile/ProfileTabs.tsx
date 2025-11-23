
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
    <div className="">{/* No padding */}
      <div className="flex bg-gradient-to-r from-transparent via-background/20 to-transparent backdrop-blur-md border border-border/5 rounded-xl p-1 mb-4 mx-3">
        <button
          onClick={() => onTabChange('posts')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === 'posts'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden sm:inline">{t('posts', { ns: 'profile' })}</span>
        </button>
        {showTrips && (
          <button
            onClick={() => onTabChange('trips')}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              activeTab === 'trips'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">{t('trips', { ns: 'profile' })}</span>
          </button>
        )}
        {showMarketing && (
          <button
            onClick={() => onTabChange('marketing')}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              activeTab === 'marketing'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">{t('marketing', { ns: 'profile' })}</span>
          </button>
        )}
        <button
          onClick={() => onTabChange('badges')}
          className={cn(
            "relative flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === 'badges'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
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
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
            activeTab === 'tagged'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground"
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
