import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, Building2, User } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

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
  const { profile } = useProfile();

  const accounts = [
    {
      id: 'personal',
      name: profile?.username || 'Personal',
      avatar: profile?.avatar_url,
      icon: <User className="w-5 h-5" />,
      description: 'Personal Account',
    },
    {
      id: 'business',
      name: 'Business Account',
      avatar: profile?.avatar_url,
      icon: <Building2 className="w-5 h-5" />,
      description: 'Business Dashboard',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Switch Account</h2>
            <p className="text-sm text-muted-foreground">
              Choose which account to use
            </p>
          </div>

          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  onSwitch(account.id as 'personal' | 'business');
                  onOpenChange(false);
                }}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:bg-accent/50',
                  currentMode === account.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={account.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                      {account.icon}
                    </AvatarFallback>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSwitchModal;
