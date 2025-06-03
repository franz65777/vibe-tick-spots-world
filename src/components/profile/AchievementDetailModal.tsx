
import { useState } from 'react';
import { X, MapPin, Trophy, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'explorer' | 'social' | 'foodie' | 'engagement' | 'streak' | 'milestone';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  gradient: string;
  earned: boolean;
  progress?: number;
  maxProgress?: number;
  earnedDate?: string;
}

interface AchievementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: Badge | null;
}

const AchievementDetailModal = ({ isOpen, onClose, badge }: AchievementDetailModalProps) => {
  if (!isOpen || !badge) return null;

  const progressPercentage = badge.progress && badge.maxProgress 
    ? (badge.progress / badge.maxProgress) * 100 
    : badge.earned ? 100 : 0;

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
      bronze: ['Special bronze badge', 'Profile boost'],
      silver: ['Special silver badge', 'Profile boost', 'Featured in discovery'],
      gold: ['Special gold badge', 'Profile boost', 'Featured in discovery', 'Early access to new features'],
      platinum: ['Special platinum badge', 'Profile boost', 'Featured in discovery', 'Early access to new features', 'Exclusive community access']
    };
    return levelRewards[badge.level] || [];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Badge Icon */}
          <div className={`w-24 h-24 mx-auto mb-4 rounded-3xl flex items-center justify-center text-4xl ${
            badge.earned 
              ? `bg-gradient-to-br ${badge.gradient} shadow-lg`
              : 'bg-gray-100'
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

          <h2 className="text-xl font-bold text-gray-900 mb-2">{badge.name}</h2>
          <p className="text-gray-600 text-sm mb-4">{badge.description}</p>

          {badge.earned && badge.earnedDate && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 rounded-full px-4 py-2">
              <Calendar className="w-4 h-4" />
              <span>Earned on {new Date(badge.earnedDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Progress Section */}
        {!badge.earned && badge.progress !== undefined && badge.maxProgress && (
          <div className="px-6 pb-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-bold text-blue-600">
                  {badge.progress}/{badge.maxProgress}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2 mb-2" />
              <p className="text-xs text-gray-500">
                {Math.round(progressPercentage)}% complete
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Next Steps */}
          {!badge.earned && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                <Target className="w-5 h-5 text-blue-600" />
                Next Steps
              </h3>
              <div className="space-y-2">
                {getNextSteps().map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Rewards
            </h3>
            <div className="space-y-2">
              {getRewards().map((reward, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{reward}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <Button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {badge.earned ? 'Awesome!' : 'Keep Going!'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AchievementDetailModal;
