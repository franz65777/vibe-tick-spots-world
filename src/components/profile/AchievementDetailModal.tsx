
import { useState } from 'react';
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
}

interface AchievementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: Badge | null;
  allBadges?: Badge[];
}

const AchievementDetailModal = ({ isOpen, onClose, badge, allBadges = [] }: AchievementDetailModalProps) => {
  const { t } = useTranslation();
  
  if (!isOpen || !badge) return null;

  const progressPercentage = badge.progress && badge.maxProgress 
    ? (badge.progress / badge.maxProgress) * 100 
    : badge.earned ? 100 : 0;

  // Find previous earned badges in the same category
  const getPreviousBadges = () => {
    if (!badge.earned) return [];
    
    const categoryBadges = allBadges.filter(b => 
      b.category === badge.category && 
      b.earned && 
      b.id !== badge.id
    );
    
    const levelOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    return categoryBadges
      .filter(b => levelOrder[b.level] < levelOrder[badge.level])
      .sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  };

  const getNextSteps = () => {
    if (badge.earned) return [];
    
    switch (badge.id) {
      case 'city-wanderer':
        return [
          'Save places in different cities',
          'Explore new destinations',
          `Current progress: ${badge.progress}/3 cities`
        ];
      case 'globe-trotter':
        return [
          'Save places in 5 different cities',
          'Try exploring international destinations',
          `Current progress: ${badge.progress}/5 cities`
        ];
      case 'foodie':
        return [
          'Save 10 restaurants to your profile',
          'Try different cuisine types',
          'Share your food discoveries'
        ];
      case 'culture-vulture':
        return [
          'Save museums and cultural venues',
          'Visit art galleries and historical sites',
          `Current progress: ${badge.progress}/5 venues`
        ];
      case 'getting-started':
        return [
          'Continue saving places you love',
          'Explore different categories',
          `Current progress: ${badge.progress}/10 places`
        ];
      case 'collector':
        return [
          'Keep discovering new places',
          'Build your travel collection',
          `Current progress: ${badge.progress}/50 places`
        ];
      case 'daily-saver':
        return [
          'Save at least one place every day',
          'Make it a daily habit',
          `Current streak: ${badge.progress}/7 days`
        ];
      default:
        return ['Keep exploring and saving places!'];
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
          <p className="text-muted-foreground text-sm mb-4">{badge.description}</p>

          {badge.earned && badge.earnedDate && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full px-4 py-2">
              <Calendar className="w-4 h-4" />
              <span>{t('earnedOn', { ns: 'badges' })} {new Date(badge.earnedDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Progress Section */}
        {!badge.earned && badge.progress !== undefined && badge.maxProgress && (
          <div className="px-6 pb-4">
            <div className="bg-muted/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{t('progress', { ns: 'badges' })}</span>
                <span className="text-sm font-bold text-primary">
                  {badge.progress}/{badge.maxProgress}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {Math.round(progressPercentage)}% {t('complete', { ns: 'badges' })}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Next Steps */}
          {!badge.earned && (
            <div className="mb-6">
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

          {/* Previous Badges */}
          {badge.earned && getPreviousBadges().length > 0 && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                {t('previouslyEarned', { ns: 'badges' })}
              </h3>
              <div className="space-y-2">
                {getPreviousBadges().map((prevBadge) => (
                  <div key={prevBadge.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <span className="text-2xl">{prevBadge.icon}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground block">{prevBadge.name}</span>
                      <span className="text-xs text-muted-foreground">{prevBadge.description}</span>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Badge Goal - Shown when current badge is earned */}
          {badge.earned && badge.nextBadgeId && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
                <Target className="w-5 h-5 text-primary" />
                {t('nextGoal', { ns: 'badges' })}
              </h3>
              {(() => {
                const nextBadge = allBadges.find(b => b.id === badge.nextBadgeId);
                if (!nextBadge) return null;
                return (
                  <div className="p-4 bg-primary/10 rounded-xl border-2 border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{nextBadge.icon}</span>
                      <div className="flex-1">
                        <span className="text-base font-semibold text-foreground block">{nextBadge.name}</span>
                        <span className="text-sm text-muted-foreground">{nextBadge.description}</span>
                      </div>
                    </div>
                    {nextBadge.progress !== undefined && nextBadge.maxProgress && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">{t('progress', { ns: 'badges' })}</span>
                          <span className="text-xs font-bold text-primary">
                            {nextBadge.progress}/{nextBadge.maxProgress}
                          </span>
                        </div>
                        <Progress value={(nextBadge.progress / nextBadge.maxProgress) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Rewards */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
              <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              {t('rewards', { ns: 'badges' })}
            </h3>
            <div className="space-y-2">
              {getRewards().map((reward, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                  <div className="w-2 h-2 bg-yellow-600 dark:bg-yellow-400 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-foreground/80">{reward}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6">
          <Button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {badge.earned ? t('awesome', { ns: 'badges' }) : t('keepGoing', { ns: 'badges' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AchievementDetailModal;
