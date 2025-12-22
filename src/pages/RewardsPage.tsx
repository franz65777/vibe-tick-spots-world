import { ArrowLeft, Coins, Gift, Percent, Tag, Star, Lock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSuperUser } from '@/hooks/useSuperUser';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
  category: 'discount' | 'feature' | 'exclusive';
  available: boolean;
}

const RewardsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { superUser } = useSuperUser();
  
  const coins = superUser?.points || 0;

  const rewards: Reward[] = [
    {
      id: 'discount-10',
      name: t('reward10Discount', { ns: 'rewards', defaultValue: '10% Discount' }),
      description: t('reward10DiscountDesc', { ns: 'rewards', defaultValue: 'Get 10% off at partner restaurants' }),
      cost: 500,
      icon: <Percent className="w-6 h-6" />,
      category: 'discount',
      available: true
    },
    {
      id: 'discount-20',
      name: t('reward20Discount', { ns: 'rewards', defaultValue: '20% Discount' }),
      description: t('reward20DiscountDesc', { ns: 'rewards', defaultValue: 'Get 20% off at partner restaurants' }),
      cost: 1000,
      icon: <Percent className="w-6 h-6" />,
      category: 'discount',
      available: true
    },
    {
      id: 'free-dessert',
      name: t('rewardFreeDessert', { ns: 'rewards', defaultValue: 'Free Dessert' }),
      description: t('rewardFreeDessertDesc', { ns: 'rewards', defaultValue: 'Claim a free dessert at select locations' }),
      cost: 750,
      icon: <Gift className="w-6 h-6" />,
      category: 'discount',
      available: true
    },
    {
      id: 'priority-booking',
      name: t('rewardPriorityBooking', { ns: 'rewards', defaultValue: 'Priority Booking' }),
      description: t('rewardPriorityBookingDesc', { ns: 'rewards', defaultValue: 'Skip the queue for popular spots' }),
      cost: 1500,
      icon: <Star className="w-6 h-6" />,
      category: 'feature',
      available: true
    },
    {
      id: 'exclusive-badge',
      name: t('rewardExclusiveBadge', { ns: 'rewards', defaultValue: 'Exclusive Badge' }),
      description: t('rewardExclusiveBadgeDesc', { ns: 'rewards', defaultValue: 'Show off your collector status' }),
      cost: 2000,
      icon: <Tag className="w-6 h-6" />,
      category: 'exclusive',
      available: true
    },
    {
      id: 'vip-access',
      name: t('rewardVIPAccess', { ns: 'rewards', defaultValue: 'VIP Access' }),
      description: t('rewardVIPAccessDesc', { ns: 'rewards', defaultValue: 'Exclusive events and experiences' }),
      cost: 5000,
      icon: <Star className="w-6 h-6" />,
      category: 'exclusive',
      available: true
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'discount': return 'from-green-500 to-emerald-600';
      case 'feature': return 'from-blue-500 to-indigo-600';
      case 'exclusive': return 'from-purple-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handleClaim = (reward: Reward) => {
    if (coins < reward.cost) {
      toast.error(t('notEnoughCoins', { ns: 'rewards', defaultValue: 'Not enough coins!' }));
      return;
    }
    // TODO: Implement actual claim logic
    toast.success(t('rewardClaimed', { ns: 'rewards', defaultValue: 'Reward claimed! Check your email for details.' }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">{t('rewards', { ns: 'rewards', defaultValue: 'Rewards' })}</h1>
        </div>
      </div>

      {/* Coins Balance */}
      <div className="px-4 py-6">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">{t('yourBalance', { ns: 'rewards', defaultValue: 'Your Balance' })}</p>
              <p className="text-3xl font-bold">{coins.toLocaleString()} {t('coins', { ns: 'rewards', defaultValue: 'coins' })}</p>
            </div>
          </div>
          <p className="text-sm opacity-80 mt-2">
            {t('earnMoreHint', { ns: 'rewards', defaultValue: 'Save places, complete challenges, and maintain your streak to earn more!' })}
          </p>
        </div>
      </div>

      {/* Rewards List */}
      <div className="px-4 pb-24">
        <h2 className="text-lg font-semibold mb-4">{t('availableRewards', { ns: 'rewards', defaultValue: 'Available Rewards' })}</h2>
        
        <div className="space-y-3">
          {rewards.map((reward) => {
            const canAfford = coins >= reward.cost;
            
            return (
              <div 
                key={reward.id}
                className={`bg-card border border-border rounded-xl p-4 transition-all ${
                  canAfford ? 'hover:shadow-md' : 'opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(reward.category)} flex items-center justify-center text-white flex-shrink-0`}>
                    {reward.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{reward.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{reward.description}</p>
                    
                    {/* Cost & Action */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                        <Coins className="w-4 h-4" />
                        <span>{reward.cost.toLocaleString()}</span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleClaim(reward)}
                        disabled={!canAfford}
                        className={canAfford 
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white hover:from-yellow-500 hover:to-amber-600' 
                          : ''
                        }
                      >
                        {canAfford ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('claim', { ns: 'rewards', defaultValue: 'Claim' })}
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-1" />
                            {t('locked', { ns: 'rewards', defaultValue: 'Locked' })}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coming Soon */}
        <div className="mt-8 p-6 bg-muted/50 rounded-xl text-center">
          <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <h3 className="font-semibold text-foreground">{t('moreComingSoon', { ns: 'rewards', defaultValue: 'More Coming Soon!' })}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('moreComingSoonDesc', { ns: 'rewards', defaultValue: 'We are working on more exciting rewards for you.' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
