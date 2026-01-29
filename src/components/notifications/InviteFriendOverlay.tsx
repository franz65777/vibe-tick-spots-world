import React, { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import addFriendIcon from '@/assets/icons/add-friend.png';

interface InviteFriendOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteFriendOverlay = memo(({ isOpen, onClose }: InviteFriendOverlayProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const didSetModalOpenRef = useRef(false);

  // Fetch user's invite code
  useEffect(() => {
    if (!isOpen || !user) return;
    
    const fetchInviteCode = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('invite_code')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setInviteCode(data?.invite_code || null);
      } catch (err) {
        console.error('Error fetching invite code:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInviteCode();
  }, [isOpen, user]);

  // Manage data-modal-open
  useEffect(() => {
    if (isOpen) {
      didSetModalOpenRef.current = true;
      document.body.setAttribute('data-modal-open', 'true');
    } else if (didSetModalOpenRef.current) {
      didSetModalOpenRef.current = false;
      document.body.removeAttribute('data-modal-open');
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
      }
    };
  }, []);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success(t('codeCopied', { ns: 'invite', defaultValue: 'Invite code copied!' }));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t('copyFailed', { ns: 'invite', defaultValue: 'Failed to copy' }));
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    
    const shareText = t('shareMessage', { 
      ns: 'invite', 
      defaultValue: `Join me on the app! Use my invite code: ${inviteCode}`,
      code: inviteCode 
    });
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareTitle', { ns: 'invite', defaultValue: 'Invite a friend' }),
          text: shareText,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback to copy
      handleCopyCode();
    }
  };

  if (!isOpen) return null;

  const overlay = (
    <div className="fixed inset-0 z-[2147483641] flex flex-col bg-background/40 backdrop-blur-xl">
      {/* Header */}
      <header 
        className="sticky top-0 z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="py-3 flex items-center px-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-foreground">
              {t('inviteFriend', { ns: 'invite', defaultValue: 'Invite a Friend' })}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Icon */}
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <img src={addFriendIcon} alt="Invite" className="w-14 h-14" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
          {t('inviteTitle', { ns: 'invite', defaultValue: 'Grow your network' })}
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-xs">
          {t('inviteDescription', { ns: 'invite', defaultValue: 'Share your invite code with friends and discover places together!' })}
        </p>

        {loading ? (
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : inviteCode ? (
          <div className="w-full max-w-sm space-y-4">
            {/* Invite code display */}
            <div className="bg-muted/50 rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {t('yourCode', { ns: 'invite', defaultValue: 'Your invite code' })}
              </p>
              <p className="text-2xl font-mono font-bold text-foreground tracking-widest">
                {inviteCode}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleCopyCode}
                variant="outline"
                className="flex-1 rounded-full h-12"
              >
                {copied ? (
                  <Check className="w-5 h-5 mr-2 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 mr-2" />
                )}
                {copied 
                  ? t('copied', { ns: 'invite', defaultValue: 'Copied!' })
                  : t('copy', { ns: 'invite', defaultValue: 'Copy' })
                }
              </Button>
              <Button 
                onClick={handleShare}
                className="flex-1 rounded-full h-12"
              >
                <Share2 className="w-5 h-5 mr-2" />
                {t('share', { ns: 'invite', defaultValue: 'Share' })}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center">
            {t('noCode', { ns: 'invite', defaultValue: 'No invite code available' })}
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
});

InviteFriendOverlay.displayName = 'InviteFriendOverlay';

export default InviteFriendOverlay;
