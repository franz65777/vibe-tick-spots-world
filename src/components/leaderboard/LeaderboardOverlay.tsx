import React, { memo, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLeaderboardOverlay } from '@/contexts/LeaderboardOverlayContext';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the actual leaderboard content
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));

const LeaderboardOverlay = memo(() => {
  const { isLeaderboardOverlayOpen, closeLeaderboardOverlay } = useLeaderboardOverlay();
  
  const didSetModalOpenRef = useRef(false);

  // Manage data-modal-open
  useEffect(() => {
    if (isLeaderboardOverlayOpen) {
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
  }, [isLeaderboardOverlayOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isLeaderboardOverlayOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLeaderboardOverlay();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLeaderboardOverlayOpen, closeLeaderboardOverlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
        window.dispatchEvent(new CustomEvent('ui:overlay-close'));
      }
    };
  }, []);

  if (!isLeaderboardOverlayOpen) return null;

  const overlay = (
    <div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
      <Suspense fallback={
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-12 w-48" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      }>
        <LeaderboardPage onClose={closeLeaderboardOverlay} />
      </Suspense>
    </div>
  );

  return createPortal(overlay, document.body);
});

LeaderboardOverlay.displayName = 'LeaderboardOverlay';

export default LeaderboardOverlay;
