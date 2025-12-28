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
      className="fixed inset-0 z-[2100] flex items-center justify-center px-6"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div 
        className="relative z-10 w-full max-w-sm bg-background rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Avatar and message */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="p-1 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
            <Avatar className="w-20 h-20 border-2 border-background">
              <AvatarImage src={avatarUrl || undefined} alt={username} className="object-cover" />
              <AvatarFallback className="text-xl font-semibold bg-muted">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="text-center text-foreground text-base leading-relaxed">
            {t('userProfile.unfollowConfirmMessage', { 
              ns: 'common',
              username: username 
            })}
          </p>
        </div>
        
        {/* Buttons */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          {/* Unfollow button */}
          <button
            onClick={onConfirm}
            className="w-full py-3.5 bg-destructive/10 text-destructive font-semibold text-base rounded-2xl hover:bg-destructive/20 transition-colors"
          >
            {t('userProfile.unfollow', { ns: 'common' })}
          </button>
          
          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-muted text-foreground font-medium text-base rounded-2xl hover:bg-muted/80 transition-colors"
          >
            {t('userProfile.cancel', { ns: 'common' })}
          </button>
        </div>
      </div>
    </div>
  );
};
