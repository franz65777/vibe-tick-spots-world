import React, { memo, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useFeedOverlay } from '@/contexts/FeedOverlayContext';

// Lazy load the actual feed content
const FeedPage = lazy(() => import('@/pages/FeedPage'));

const FeedOverlay = memo(() => {
  const { isFeedOverlayOpen, closeFeedOverlay } = useFeedOverlay();
  
  const didSetModalOpenRef = useRef(false);

  // Manage data-modal-open
  useEffect(() => {
    if (isFeedOverlayOpen) {
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
  }, [isFeedOverlayOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isFeedOverlayOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFeedOverlay();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFeedOverlayOpen, closeFeedOverlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
        window.dispatchEvent(new CustomEvent('ui:overlay-close'));
      }
    };
  }, []);

  if (!isFeedOverlayOpen) return null;

  const overlay = (
    <div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <FeedPage onClose={closeFeedOverlay} />
      </Suspense>
    </div>
  );

  return createPortal(overlay, document.body);
});

FeedOverlay.displayName = 'FeedOverlay';

export default FeedOverlay;
