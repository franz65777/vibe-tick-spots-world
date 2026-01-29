import React, { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Send, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { usePhoneContacts, FoundContact } from '@/hooks/usePhoneContacts';
import AvatarStack from '@/components/common/AvatarStack';
import ContactsFoundView from '@/components/notifications/ContactsFoundView';
import { toast } from 'sonner';

interface InviteFriendOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Placeholder download link - update when app is in stores
const DOWNLOAD_LINK = 'https://spott.app/download';

// Placeholder avatars for the "find friends" section
const placeholderAvatars = [
  { url: null, name: 'A' },
  { url: null, name: 'B' },
  { url: null, name: 'C' },
];

const InviteFriendOverlay = memo(({ isOpen, onClose }: InviteFriendOverlayProps) => {
  const { t } = useTranslation();
  const { checkContacts, loading, matches, permissionDenied, error, isNativePlatform } = usePhoneContacts();
  const [showContactsFound, setShowContactsFound] = useState(false);
  const [foundContacts, setFoundContacts] = useState<FoundContact[]>([]);
  
  const didSetModalOpenRef = useRef(false);

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
    <div className="fixed inset-0 z-[2147483641] flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <header 
        className="sticky top-0 z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="py-3 flex items-center px-4">
          <Button
            onClick={() => showContactsFound ? setShowContactsFound(false) : onClose()}
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {showContactsFound ? (
        <ContactsFoundView 
          contacts={foundContacts} 
          onClose={() => setShowContactsFound(false)} 
        />
      ) : (
        /* Main Content - Two Cards */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
          
          {/* Card 1: Invite Friends */}
          <div className="w-full max-w-sm bg-card rounded-3xl p-8 shadow-lg border border-border/50">
            {/* SPOTT Logo */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center">
                <h1 className="text-3xl font-bold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent relative flex items-baseline">
                  SPOTT
                  <MapPin className="w-4 h-4 text-blue-600 fill-blue-600 ml-1" />
                </h1>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-center text-foreground mb-2">
              {t('haveFriendsTitle', { ns: 'invite', defaultValue: 'have friends with good taste?' })}
            </h2>
            
            <p className="text-muted-foreground text-center text-sm mb-6">
              {t('inviteDescription', { ns: 'invite', defaultValue: 'Share the app and discover places together' })}
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
          <div className="w-full max-w-sm bg-card rounded-3xl p-8 shadow-lg border border-border/50">
            {/* Avatar Stack */}
            <div className="flex justify-center mb-6">
              <AvatarStack avatars={placeholderAvatars} size="lg" />
            </div>
            
            <h2 className="text-xl font-semibold text-center text-foreground mb-2">
              {t('findYourFriends', { ns: 'invite', defaultValue: 'find your friends' })}
            </h2>
            
            {/* Privacy Note */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-6">
              <Lock className="w-3 h-3" />
              <span>
                {t('privacyNote', { ns: 'invite', defaultValue: 'we never upload or store your contacts' })}
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
                  <Users className="w-5 h-5 mr-2" />
                  {t('checkContacts', { ns: 'invite', defaultValue: 'check contacts' })}
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
