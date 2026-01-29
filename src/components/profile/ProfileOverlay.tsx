import React, { memo, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useProfileOverlay } from '@/contexts/ProfileOverlayContext';
import ProfileSkeleton from '@/components/ProfileSkeleton';

// Lazy load the actual profile content
const ProfilePage = lazy(() => import('@/components/ProfilePage'));

const ProfileOverlay = memo(() => {
  const { isProfileOverlayOpen, closeProfileOverlay } = useProfileOverlay();
  
  const didSetModalOpenRef = useRef(false);

  // Manage data-modal-open
  useEffect(() => {
    if (isProfileOverlayOpen) {
      didSetModalOpenRef.current = true;
      document.body.setAttribute('data-modal-open', 'true');
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
      window.dispatchEvent(new CustomEvent('close-search-drawer'));
      window.dispatchEvent(new CustomEvent('close-filter-dropdown'));
      window.dispatchEvent(new CustomEvent('close-city-selector'));
      window.dispatchEvent(new CustomEvent('close-list-view'));
    } else if (didSetModalOpenRef.current) {
      didSetModalOpenRef.current = false;
      document.body.removeAttribute('data-modal-open');
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }, [isProfileOverlayOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isProfileOverlayOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProfileOverlay();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileOverlayOpen, closeProfileOverlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
        window.dispatchEvent(new CustomEvent('ui:overlay-close'));
      }
    };
  }, []);

  if (!isProfileOverlayOpen) return null;

  const overlay = (
    <div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfilePage />
      </Suspense>
    </div>
  );

  return createPortal(overlay, document.body);
});

ProfileOverlay.displayName = 'ProfileOverlay';

export default ProfileOverlay;
