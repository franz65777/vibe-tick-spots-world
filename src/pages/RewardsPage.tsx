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
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-md">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/profile?tab=badges')}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
              aria-label={t('back', { ns: 'common', defaultValue: 'Back' })}
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{t('rewards', { ns: 'profile' })}</h1>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-28">
        {/* Coins Balance */}
        <section className="px-4 pt-5 pb-4">
          <article className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_18px_45px_-25px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500" />
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm/5 opacity-90">{t('yourBalance', { ns: 'profile' })}</p>
                  <p className="text-3xl font-black leading-tight tracking-tight">
                    {coins.toLocaleString()} {t('coins', { ns: 'profile' })}
                  </p>
                </div>
              </div>
              <p className="text-sm opacity-90 mt-3 leading-snug">
                {t('earnMoreHint', { ns: 'profile' })}
              </p>
            </div>
          </article>
        </section>

        {/* Rewards List */}
        <main className="px-4 pb-6">
          <header className="flex items-end justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('availableRewards', { ns: 'profile' })}</h2>
            <div className="text-xs text-muted-foreground">
              {t('coins', { ns: 'profile' })}:{' '}
              <span className="font-semibold text-foreground">{coins.toLocaleString()}</span>
            </div>
          </header>

          <section className="space-y-3">
            {rewards.map((reward) => {
              const canAfford = coins >= reward.cost;

              return (
                <article
                  key={reward.id}
                  className={`bg-card rounded-3xl p-4 shadow-sm transition-all ${
                    canAfford ? 'hover:shadow-md' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getCategoryColor(reward.category)} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                      {reward.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{t(reward.nameKey, { ns: 'profile' })}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{t(reward.descKey, { ns: 'profile' })}</p>

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
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-sm rounded-full px-4'
                            : 'rounded-full px-4'
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
                </article>
              );
            })}
          </section>

          <aside className="mt-6 p-6 bg-muted/30 rounded-3xl text-center">
            <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="font-semibold text-foreground">{t('moreComingSoon', { ns: 'profile' })}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('moreComingSoonDesc', { ns: 'profile' })}
            </p>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default RewardsPage;
