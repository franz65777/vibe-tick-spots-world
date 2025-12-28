import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface UnfollowConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  avatarUrl: string | null;
  username: string;
}

export const UnfollowConfirmDialog: React.FC<UnfollowConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  avatarUrl,
  username,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getInitials = () => {
    return username?.substring(0, 2).toUpperCase() || 'U';
  };

  return (
    <div 
      className="fixed inset-0 z-[2100] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Dialog container */}
      <div 
        className="relative z-10 w-full px-4 pb-4 flex flex-col gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main dialog */}
        <div className="bg-background rounded-2xl overflow-hidden">
          {/* Avatar and message */}
          <div className="flex flex-col items-center pt-6 pb-4 px-6">
            <Avatar className="w-16 h-16 mb-4">
              <AvatarImage src={avatarUrl || undefined} alt={username} className="object-cover" />
              <AvatarFallback className="text-lg font-semibold bg-muted">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <p className="text-center text-foreground text-sm">
              {t('userProfile.unfollowConfirmMessage', { 
                ns: 'common',
                username: username 
              })}
            </p>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-border" />
          
          {/* Unfollow button */}
          <button
            onClick={onConfirm}
            className="w-full py-4 text-destructive font-medium text-base hover:bg-muted/50 transition-colors"
          >
            {t('userProfile.unfollow', { ns: 'common' })}
          </button>
        </div>
        
        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full py-4 bg-background rounded-2xl font-medium text-base text-foreground hover:bg-muted/50 transition-colors"
        >
          {t('common.cancel', { ns: 'common' })}
        </button>
      </div>
    </div>
  );
};
