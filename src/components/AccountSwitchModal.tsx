import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, Building2, User, Plus } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface AccountSwitchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitch: (mode: 'personal' | 'business') => void;
  currentMode: 'personal' | 'business';
}

const AccountSwitchModal: React.FC<AccountSwitchModalProps> = ({
  open,
  onOpenChange,
  onSwitch,
  currentMode,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { hasValidBusinessAccount } = useBusinessProfile();
  const [locationName, setLocationName] = useState<string>('Business Account');
  const [locationCategory, setLocationCategory] = useState<string>('restaurant');

  useEffect(() => {
    const fetchLocation = async () => {
      if (!profile?.id || !hasValidBusinessAccount) return;

      try {
        // Fetch the first location claimed by this user
        const { data, error } = await supabase
          .from('locations')
          .select('name, category')
          .eq('claimed_by', profile.id)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setLocationName(data.name);
          setLocationCategory(data.category || 'restaurant');
        }
      } catch (err) {
        console.error('Error fetching location:', err);
      }
    };

    if (open) {
      fetchLocation();
    }
  }, [open, profile?.id, hasValidBusinessAccount]);

  const CategoryIcon = getCategoryIcon(locationCategory);

  const accounts = hasValidBusinessAccount
    ? [
        {
          id: 'personal',
          name: profile?.username || 'Personal',
          avatar: profile?.avatar_url,
          icon: <User className="w-5 h-5" />,
          description: t('personalAccount', { ns: 'accountSwitch' }),
        },
        {
          id: 'business',
          name: locationName,
          avatar: null,
          icon: <CategoryIcon className="w-5 h-5" />,
          description: t('businessDashboard', { ns: 'accountSwitch' }),
        },
      ]
    : [
        {
          id: 'personal',
          name: profile?.username || 'Personal',
          avatar: profile?.avatar_url,
          icon: <User className="w-5 h-5" />,
          description: t('personalAccount', { ns: 'accountSwitch' }),
        },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-0 gap-0 bottom-[88px] top-auto translate-y-0 data-[state=open]:slide-in-from-bottom-0 max-w-[calc(100%-32px)] sm:max-w-[calc(640px-32px)] mx-auto">
        <div className="space-y-4 px-6 pt-4 pb-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-1">{t('title', { ns: 'accountSwitch' })}</h2>
            <p className="text-xs text-muted-foreground">
              {t('subtitle', { ns: 'accountSwitch' })}
            </p>
          </div>

          <div className="space-y-3">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  onSwitch(account.id as 'personal' | 'business');
                  onOpenChange(false);
                }}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:bg-accent/50',
                  currentMode === account.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    {account.id === 'personal' ? (
                      <>
                        <AvatarImage src={account.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                          {account.icon}
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                        {account.icon}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {currentMode === account.id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="font-semibold text-foreground">
                    {account.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {account.description}
                  </div>
                </div>
              </button>
            ))}

            {/* Request Business Account Button */}
            {!hasValidBusinessAccount && (
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-border bg-muted/30 transition-all hover:bg-muted/50 hover:border-primary/50"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                      <Plus className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 text-left">
                  <div className="font-semibold text-foreground">
                    {t('requestBusiness', { ns: 'accountSwitch' })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('requestBusinessDescription', { ns: 'accountSwitch' })}
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSwitchModal;
