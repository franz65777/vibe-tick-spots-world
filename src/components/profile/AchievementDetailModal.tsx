
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
      <div className="bg-[#5c6b7d] rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          {/* Badge Icon */}
          <div className={`w-24 h-24 mx-auto mb-4 rounded-3xl flex items-center justify-center text-4xl ${
            badge.earned 
              ? `bg-gradient-to-br ${badge.gradient} shadow-lg`
              : 'bg-white/20'
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

          <h2 className="text-xl font-bold text-white mb-2">{badge.name}</h2>
          <p className="text-white/70 text-sm mb-4">{badge.description}</p>

          {badge.earned && badge.earnedDate && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-400 bg-green-900/20 rounded-full px-4 py-2">
              <Calendar className="w-4 h-4" />
              <span>{t('earnedOn', { ns: 'badges' })} {new Date(badge.earnedDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Progress Section */}
        {!badge.earned && badge.progress !== undefined && badge.maxProgress && (
          <div className="px-6 pb-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">{t('progress', { ns: 'badges' })}</span>
                <span className="text-sm font-bold text-green-400">
                  {badge.progress}/{badge.maxProgress}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2 mb-2" />
              <p className="text-xs text-white/60">
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
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <Target className="w-5 h-5 text-blue-400" />
                {t('nextSteps', { ns: 'badges' })}
              </h3>
              <div className="space-y-2">
                {getNextSteps().map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-900/20 rounded-xl">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-white/80">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Badges */}
          {badge.earned && getPreviousBadges().length > 0 && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                {t('previouslyEarned', { ns: 'badges' })}
              </h3>
              <div className="space-y-2">
                {getPreviousBadges().map((prevBadge) => (
                  <div key={prevBadge.id} className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                    <span className="text-2xl">{prevBadge.icon}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white block">{prevBadge.name}</span>
                      <span className="text-xs text-white/60">{prevBadge.description}</span>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              {t('rewards', { ns: 'badges' })}
            </h3>
            <div className="space-y-2">
              {getRewards().map((reward, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-yellow-900/20 rounded-xl">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-white/80">{reward}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
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
