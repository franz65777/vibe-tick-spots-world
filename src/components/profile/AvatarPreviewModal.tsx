import React from 'react';
import { X, UserPlus, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';

interface AvatarPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  username: string;
  isFollowing: boolean;
  followRequestStatus?: string | null;
  onFollowToggle: () => void;
  onShare: () => void;
  followLoading: boolean;
}

export const AvatarPreviewModal: React.FC<AvatarPreviewModalProps> = ({
  isOpen,
  onClose,
  avatarUrl,
  username,
  isFollowing,
  followRequestStatus,
  onFollowToggle,
  onShare,
  followLoading
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getInitials = () => {
    return username?.substring(0, 2).toUpperCase() || 'U';
  };

  const getFollowButtonText = () => {
    if (isFollowing) {
      return t('userProfile.alreadyFollowing', { ns: 'common' });
    }
    if (followRequestStatus === 'pending') {
      return t('userProfile.requestSent', { ns: 'common' });
    }
    return t('userProfile.follow', { ns: 'common' });
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Blurred Background - using avatar as background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
          backgroundColor: avatarUrl ? 'transparent' : 'hsl(var(--muted))'
        }}
      />
      <div className="absolute inset-0 backdrop-blur-3xl bg-black/30" />
      
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 z-10 p-2 rounded-full bg-black/20 backdrop-blur-sm"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Main Content */}
      <div 
        className="relative z-10 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Large Avatar */}
        <div className="w-64 h-64 rounded-full border-4 border-white/30 overflow-hidden shadow-2xl">
          <Avatar className="w-full h-full">
            <AvatarImage src={avatarUrl || undefined} alt={username} className="object-cover" />
            <AvatarFallback className="text-5xl font-semibold bg-muted">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+40px)] left-0 right-0 flex justify-center gap-8 z-10">
        {/* Follow Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onFollowToggle();
          }}
          disabled={followLoading}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <UserPlus className="w-6 h-6 text-foreground" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {getFollowButtonText()}
          </span>
        </button>

        {/* Share Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Share2 className="w-6 h-6 text-foreground" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {t('userProfile.share', { ns: 'common', defaultValue: 'Condividi' })}
          </span>
        </button>
      </div>
    </div>
  );
};
