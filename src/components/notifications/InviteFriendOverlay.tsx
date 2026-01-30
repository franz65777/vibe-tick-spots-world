import React, { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { usePhoneContacts, FoundContact } from '@/hooks/usePhoneContacts';
import AvatarStack from '@/components/common/AvatarStack';
import ContactsFoundView from '@/components/notifications/ContactsFoundView';
import { toast } from 'sonner';
import spottLogoColorful from '@/assets/spott-logo-colorful.png';
import syncContactsIcon from '@/assets/icons/sync-contacts.png';

interface InviteFriendOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Placeholder download link - update when app is in stores
const DOWNLOAD_LINK = 'https://spott.app/download';

// Real avatars for the "find friends" section
const placeholderAvatars = [
  { 
    url: 'https://hrmklsvewmhpqixgyjmy.supabase.co/storage/v1/object/public/avatars/101423bc-a06c-40cc-8bb9-42af76946e4d/avatar/avatar-1765123237885.jpg', 
    name: 'yungtrinky' 
  },
  { 
    url: 'https://hrmklsvewmhpqixgyjmy.supabase.co/storage/v1/object/public/avatars/avatars/6e627794-6ac1-4830-9737-de5158761904-1763140984090.jpg', 
    name: 'ore' 
  },
  { 
    url: 'https://hrmklsvewmhpqixgyjmy.supabase.co/storage/v1/object/public/media/4ff2a819-7556-4b74-a0ad-6950a03285c9/avatar/avatar-1750188571035.jpeg', 
    name: 'sarita' 
  },
];

const InviteFriendOverlay = memo(({ isOpen, onClose }: InviteFriendOverlayProps) => {
  const { t } = useTranslation();
  const { checkContacts, loading, matches, permissionDenied, error, isNativePlatform } = usePhoneContacts();
  const [showContactsFound, setShowContactsFound] = useState(false);
  const [foundContacts, setFoundContacts] = useState<FoundContact[]>([]);
  
  const didSetModalOpenRef = useRef(false);

  // Manage data-modal-open - only set if not already set by parent overlay
  useEffect(() => {
    if (isOpen) {
      // Only set if not already set (avoids conflicts with parent overlay)
      if (!document.body.hasAttribute('data-modal-open')) {
        didSetModalOpenRef.current = true;
        document.body.setAttribute('data-modal-open', 'true');
      }
    } else if (didSetModalOpenRef.current) {
      didSetModalOpenRef.current = false;
      document.body.removeAttribute('data-modal-open');
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showContactsFound) {
          setShowContactsFound(false);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showContactsFound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
      }
    };
  }, []);

  const handleInvite = async () => {
    const shareText = t('inviteShareMessage', { 
      ns: 'invite', 
      defaultValue: `Join me on SPOTT to discover the best places! Download the app: ${DOWNLOAD_LINK}`,
    });
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SPOTT',
          text: shareText,
          url: DOWNLOAD_LINK,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}`);
        toast.success(t('linkCopied', { ns: 'invite', defaultValue: 'Link copied to clipboard!' }));
      } catch (err) {
        toast.error(t('copyFailed', { ns: 'invite', defaultValue: 'Failed to copy' }));
      }
    }
  };

  const handleCheckContacts = async () => {
    if (!isNativePlatform) {
      toast.info(t('mobileOnly', { ns: 'invite', defaultValue: 'Available on mobile app' }));
      return;
    }
    
    const results = await checkContacts();
    if (results.length > 0) {
      setFoundContacts(results);
      setShowContactsFound(true);
    } else if (permissionDenied) {
      toast.error(t('permissionDenied', { ns: 'invite', defaultValue: 'Contact access denied. Please enable in settings.' }));
    } else if (error) {
      toast.error(error);
    } else {
      toast.info(t('noFriendsFound', { ns: 'invite', defaultValue: 'No friends found on SPOTT yet' }));
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
        <div className="py-3 flex items-center gap-3 px-4">
          <Button
            onClick={() => showContactsFound ? setShowContactsFound(false) : onClose()}
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-xl text-foreground">
            {t('pageTitle', { ns: 'invite', defaultValue: 'Invite a Friend' })}
          </h1>
        </div>
      </header>

      {showContactsFound ? (
        <ContactsFoundView 
          contacts={foundContacts} 
          onClose={() => setShowContactsFound(false)} 
        />
      ) : (
        /* Main Content - Two Cards */
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 gap-4">
          
          {/* Card 1: Invite Friends */}
          <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-lg border border-border/50">
            {/* SPOTT Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src={spottLogoColorful} 
                alt="SPOTT" 
                className="h-24 w-auto animate-bounce-gentle"
              />
            </div>
            
            <h2 className="text-xl font-semibold text-center text-foreground mb-2">
              {t('haveFriendsTitle', { ns: 'invite', defaultValue: 'have friends with good taste?' })}
            </h2>
            
            <p className="text-muted-foreground text-center text-sm mb-4">
              {t('inviteDescription', { ns: 'invite', defaultValue: 'bring them to SPOTT - share your favorite spots' })}
            </p>
            
            {/* Gradient Invite Button */}
            <Button 
              onClick={handleInvite}
              className="w-full h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white font-medium"
            >
              <Send className="w-5 h-5 mr-2" />
              {t('inviteThem', { ns: 'invite', defaultValue: 'invite them' })}
            </Button>
          </div>

          {/* Card 2: Find Friends */}
          <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-lg border border-border/50">
            {/* Avatar Stack */}
            <div className="flex justify-center mb-4">
              <AvatarStack avatars={placeholderAvatars} size="lg" />
            </div>
            
            <h2 className="text-xl font-semibold text-center text-foreground mb-2">
              {t('findYourFriends', { ns: 'invite', defaultValue: "who's already here?" })}
            </h2>
            
            {/* Privacy Note */}
            <div className="flex items-center justify-center text-muted-foreground text-xs mb-4 text-center">
              <span className="text-center">
                {t('privacyNote', { ns: 'invite', defaultValue: 'we never upload or store your contacts' })} 🔒
              </span>
            </div>
            
            {/* Check Contacts Button */}
            <Button 
              onClick={handleCheckContacts}
              disabled={loading}
              variant="default"
              className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
              <>
                  <img src={syncContactsIcon} alt="" className="w-5 h-5 mr-2" />
                  {t('checkContacts', { ns: 'invite', defaultValue: 'sync contacts' })}
                </>
              )}
            </Button>
          </div>
          
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
});

InviteFriendOverlay.displayName = 'InviteFriendOverlay';

export default InviteFriendOverlay;
