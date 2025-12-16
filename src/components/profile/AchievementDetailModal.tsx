
import { useState, useEffect } from 'react';
import { X, MapPin, Trophy, Target, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'explorer' | 'social' | 'foodie' | 'engagement' | 'streak' | 'milestone' | 'planner';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  gradient: string;
  earned: boolean;
  progress?: number;
  maxProgress?: number;
  earnedDate?: string;
  nextBadgeId?: string;
  currentLevel?: number;
  levels?: {
    level: number;
    name: string;
    requirement: number;
    earned: boolean;
    earnedDate?: string;
  }[];
}

interface AchievementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: Badge | null;
  allBadges?: Badge[];
}

const AchievementDetailModal = ({ isOpen, onClose, badge, allBadges = [] }: AchievementDetailModalProps) => {
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  useEffect(() => {
    if (badge) {
      const next = (badge.levels || []).find(l => !l.earned);
      setSelectedLevel(next ? next.level : (badge.currentLevel || 1));
    }
  }, [badge, isOpen]);
  
  if (!isOpen || !badge) return null;

  const currentLevel = badge.currentLevel || 0;
  const levels = badge.levels || [];
  const nextLevel = levels.find(l => !l.earned);
  const earnedLevels = levels.filter(l => l.earned);
  
  const displayLevel = levels.find(l => l.level === selectedLevel) || nextLevel || earnedLevels[earnedLevels.length - 1];
  const progressValue = badge.progress ?? 0;
  const progressPercentage = displayLevel ? Math.min(100, (progressValue / displayLevel.requirement) * 100) : 100;
  const unit = badge.id === 'explorer' ? t('cities', { ns: 'badges' }) :
    badge.id === 'collector' ? t('places', { ns: 'badges' }) :
    badge.id === 'influencer' ? t('likes', { ns: 'badges' }) :
    badge.id === 'contentCreator' ? t('posts', { ns: 'badges' }) :
    badge.id === 'localGuide' ? t('reviews', { ns: 'badges' }) :
    badge.id === 'socialNetwork' ? t('followers', { ns: 'badges' }) :
    badge.id === 'streak' ? t('days', { ns: 'badges' }) : t('places', { ns: 'badges' });
  
  // Get level-specific description
  const getLevelDescription = () => {
    if (!displayLevel) return badge.description;
    const requirement = displayLevel.requirement;
    switch (badge.id) {
      case 'explorer':
        return t('cityWandererLevelDesc', { ns: 'badges', count: requirement, defaultValue: `Save locations in ${requirement} different cities` });
      case 'collector':
        return t('collectorLevelDesc', { ns: 'badges', count: requirement, defaultValue: `Save ${requirement} locations` });
      case 'influencer':
        return t('influencerLevelDesc', { ns: 'badges', count: requirement, defaultValue: `Receive ${requirement} likes on your posts` });
      case 'contentCreator':
        return t('contentCreatorLevelDesc', { ns: 'badges', count: requirement, defaultValue: `Create ${requirement} posts` });
      case 'localGuide':
        return t('localGuideLevelDesc', { ns: 'badges', count: requirement, defaultValue: `Write ${requirement} reviews` });
      case 'socialNetwork':
        return t('socialNetworkLevelDesc', { ns: 'badges', count: requirement, defaultValue: `Get ${requirement} followers` });
      default:
        return badge.description;
    }
  };
  const remaining = displayLevel ? Math.max(0, displayLevel.requirement - progressValue) : 0;

  const getNextSteps = () => {
    const activeLevel = levels.find(l => l.level === selectedLevel);
    if (!activeLevel || activeLevel.earned) return [];
    
    switch (badge.id) {
      case 'explorer':
        return [
          t('exploreDifferentCities', { ns: 'badges' }),
          t('tryNewDestinations', { ns: 'badges' }),
          `${t('currentProgress', { ns: 'badges' })}: ${badge.progress}/${activeLevel.requirement} ${t('cities', { ns: 'badges' })}`
        ];
      case 'foodie':
        return [
          t('saveMoreRestaurants', { ns: 'badges' }),
          t('tryDifferentCuisines', { ns: 'badges' }),
          `${t('currentProgress', { ns: 'badges' })}: ${badge.progress}/${activeLevel.requirement} ${t('restaurants', { ns: 'badges' })}`
        ];
      case 'culture':
        return [
          t('saveMuseumsVenues', { ns: 'badges' }),
          t('visitGalleriesSites', { ns: 'badges' }),
          `${t('currentProgress', { ns: 'badges' })}: ${badge.progress}/${activeLevel.requirement} ${t('venues', { ns: 'badges' })}`
        ];
      case 'collector':
        return [
          t('keepDiscovering', { ns: 'badges' }),
          t('buildCollection', { ns: 'badges' }),
          `${t('currentProgress', { ns: 'badges' })}: ${badge.progress}/${activeLevel.requirement} ${t('places', { ns: 'badges' })}`
        ];
      case 'streak':
        return [
          t('saveDaily', { ns: 'badges' }),
          t('makeItHabit', { ns: 'badges' }),
          `${t('currentStreak', { ns: 'badges' })}: ${badge.progress}/${activeLevel.requirement} ${t('days', { ns: 'badges' })}`
        ];
      default:
        return [t('keepExploring', { ns: 'badges' })];
    }
  };

  const getRewards = () => {
    const levelRewards = {
      bronze: [t('specialBronzeBadge', { ns: 'badges' }), t('profileBoost', { ns: 'badges' })],
      silver: [t('specialSilverBadge', { ns: 'badges' }), t('profileBoost', { ns: 'badges' }), t('featuredInDiscovery', { ns: 'badges' })],
      gold: [t('specialGoldBadge', { ns: 'badges' }), t('profileBoost', { ns: 'badges' }), t('featuredInDiscovery', { ns: 'badges' }), t('earlyAccessFeatures', { ns: 'badges' })],
      platinum: [t('specialPlatinumBadge', { ns: 'badges' }), t('profileBoost', { ns: 'badges' }), t('featuredInDiscovery', { ns: 'badges' }), t('earlyAccessFeatures', { ns: 'badges' }), t('exclusiveCommunityAccess', { ns: 'badges' })]
    };
    return levelRewards[badge.level] || [];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
          
          {/* Badge Icon */}
          <div className={`w-24 h-24 mx-auto mb-4 rounded-3xl flex items-center justify-center text-4xl ${
            badge.earned 
              ? `bg-gradient-to-br ${badge.gradient} shadow-lg`
              : 'bg-muted'
          }`}>
            <span className={badge.earned ? 'filter-none' : 'filter grayscale opacity-60'}>
              {badge.icon}
            </span>
            {badge.earned && (
              <div className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                badge.level === 'bronze' ? 'bg-orange-500' :
                badge.level === 'silver' ? 'bg-gray-400' :
                badge.level === 'gold' ? 'bg-yellow-500' : 
                'bg-purple-500'
              }`}>
                <Trophy className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">{badge.name}</h2>
          <p className="text-muted-foreground text-sm mb-4">{getLevelDescription()}</p>

          {currentLevel > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-4 py-2">
              <Trophy className="w-4 h-4" />
              <span>{t('level', { ns: 'badges' })} {currentLevel}/3 {t('completed', { ns: 'badges' })}</span>
            </div>
          )}
        </div>

          {/* Level Selector + Progress */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">{t('selectLevel', { ns: 'badges' })}</span>
              <div className="inline-flex rounded-lg bg-muted p-1">
                {[1,2,3].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-3 py-1 rounded-md text-sm ${selectedLevel === lvl ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/80'}`}
                    aria-pressed={selectedLevel === lvl}
                    aria-label={`${t('level', { ns: 'badges' })} ${lvl}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            {displayLevel && (
              <div className="bg-muted/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">{t('progress', { ns: 'badges' })}</span>
                  <span className="text-sm font-bold text-primary">
                    {badge.progress ?? 0}/{displayLevel.requirement}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {displayLevel.earned
                    ? t('completed', { ns: 'badges' })
                    : `${t('remaining', { ns: 'badges' })}: ${remaining} ${unit}`}
                </p>
              </div>
            )}
          </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* Next Level Goal */}
          {displayLevel && !displayLevel.earned && (
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
                <Target className="w-5 h-5 text-primary" />
                {t('nextSteps', { ns: 'badges' })}
              </h3>
              <div className="space-y-2">
                {getNextSteps().map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-primary/10 rounded-xl">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-foreground/80">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementDetailModal;
