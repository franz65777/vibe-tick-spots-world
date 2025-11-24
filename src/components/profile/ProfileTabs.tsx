
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
      <div className="relative flex bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md rounded-xl p-1 mb-4 mx-3">
        <div className="absolute inset-0 rounded-xl border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
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
