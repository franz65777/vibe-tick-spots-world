import { ArrowLeft, Coins, Gift, Percent, Tag, Star, Lock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSuperUser } from '@/hooks/useSuperUser';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Reward {
  id: string;
  nameKey: string;
  descKey: string;
  cost: number;
  icon: React.ReactNode;
  category: 'discount' | 'feature' | 'exclusive';
}

const RewardsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { superUser } = useSuperUser();
  
  const coins = superUser?.points || 0;

  const rewards: Reward[] = [
    {
      id: 'discount-10',
      nameKey: 'reward10Discount',
      descKey: 'reward10DiscountDesc',
      cost: 500,
      icon: <Percent className="w-6 h-6" />,
      category: 'discount',
    },
    {
      id: 'discount-20',
      nameKey: 'reward20Discount',
      descKey: 'reward20DiscountDesc',
      cost: 1000,
      icon: <Percent className="w-6 h-6" />,
      category: 'discount',
    },
    {
      id: 'free-dessert',
      nameKey: 'rewardFreeDessert',
      descKey: 'rewardFreeDessertDesc',
      cost: 750,
      icon: <Gift className="w-6 h-6" />,
      category: 'discount',
    },
    {
      id: 'priority-booking',
      nameKey: 'rewardPriorityBooking',
      descKey: 'rewardPriorityBookingDesc',
      cost: 1500,
      icon: <Star className="w-6 h-6" />,
      category: 'feature',
    },
    {
      id: 'exclusive-badge',
      nameKey: 'rewardExclusiveBadge',
      descKey: 'rewardExclusiveBadgeDesc',
      cost: 2000,
      icon: <Tag className="w-6 h-6" />,
      category: 'exclusive',
    },
    {
      id: 'vip-access',
      nameKey: 'rewardVIPAccess',
      descKey: 'rewardVIPAccessDesc',
      cost: 5000,
      icon: <Star className="w-6 h-6" />,
      category: 'exclusive',
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'discount': return 'from-emerald-500 to-green-600';
      case 'feature': return 'from-blue-500 to-indigo-600';
      case 'exclusive': return 'from-purple-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handleClaim = (reward: Reward) => {
    if (coins < reward.cost) {
      toast.error(t('notEnoughCoins', { ns: 'profile' }));
      return;
    }
    toast.success(t('rewardClaimed', { ns: 'profile' }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate('/profile', { state: { activeTab: 'badges' } })}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('rewards', { ns: 'profile' })}</h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Coins Balance */}
        <div className="px-4 py-6">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">{t('yourBalance', { ns: 'profile' })}</p>
                <p className="text-3xl font-bold">{coins.toLocaleString()} {t('coins', { ns: 'profile' })}</p>
              </div>
            </div>
            <p className="text-sm opacity-80 mt-3">
              {t('earnMoreHint', { ns: 'profile' })}
            </p>
          </div>
        </div>

        {/* Rewards List */}
        <div className="px-4 pb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('availableRewards', { ns: 'profile' })}</h2>
          
          <div className="space-y-3">
            {rewards.map((reward) => {
              const canAfford = coins >= reward.cost;
              
              return (
                <div 
                  key={reward.id}
                  className={`bg-card rounded-xl p-4 shadow-sm transition-all ${
                    canAfford ? 'hover:shadow-md' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getCategoryColor(reward.category)} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                      {reward.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{t(reward.nameKey, { ns: 'profile' })}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{t(reward.descKey, { ns: 'profile' })}</p>
                      
                      {/* Cost & Action */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                          <Coins className="w-4 h-4" />
                          <span>{reward.cost.toLocaleString()}</span>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => handleClaim(reward)}
                          disabled={!canAfford}
                          className={canAfford 
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-sm' 
                            : ''
                          }
                        >
                          {canAfford ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('claim', { ns: 'profile' })}
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-1" />
                              {t('locked', { ns: 'profile' })}
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
          <div className="mt-6 p-6 bg-muted/30 rounded-xl text-center">
            <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="font-semibold text-foreground">{t('moreComingSoon', { ns: 'profile' })}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('moreComingSoonDesc', { ns: 'profile' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
