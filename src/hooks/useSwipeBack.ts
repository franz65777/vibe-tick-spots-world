import { useRef, useCallback, useState, useEffect } from 'react';

interface UseSwipeBackOptions {
  edgeWidth?: number;
  threshold?: number;
  enabled?: boolean;
}

export const useSwipeBack = (
  onBack: () => void,
  options: UseSwipeBackOptions = {}
) => {
  const { edgeWidth = 30, threshold = 80, enabled = true } = options;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const currentX = useRef(0);
  const isActiveSwipe = useRef(false);
  
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipingBack, setIsSwipingBack] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    // Only activate if touch starts within edge zone
    if (startX <= edgeWidth) {
      touchStartX.current = startX;
      touchStartY.current = touch.clientY;
      isActiveSwipe.current = true;
      setIsSwipingBack(true);
    }
  }, [enabled, edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isActiveSwipe.current || !enabled) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Cancel if vertical movement is greater than horizontal
    if (deltaY > Math.abs(deltaX) && deltaX < 20) {
      isActiveSwipe.current = false;
      setIsSwipingBack(false);
      setSwipeProgress(0);
      return;
    }
    
    // Only track rightward swipes
    if (deltaX > 0) {
      currentX.current = deltaX;
      // Calculate progress as percentage (0 to 1)
      const progress = Math.min(deltaX / threshold, 1);
      setSwipeProgress(progress);
      
      // Prevent default to avoid scroll interference
      if (deltaX > 10) {
        e.preventDefault();
      }
    }
  }, [enabled, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isActiveSwipe.current || !enabled) return;
    
    const shouldNavigateBack = currentX.current >= threshold;
    
    if (shouldNavigateBack) {
      onBack();
    }
    
    // Reset state
    isActiveSwipe.current = false;
    currentX.current = 0;
    setSwipeProgress(0);
    setIsSwipingBack(false);
  }, [enabled, threshold, onBack]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  return { 
    containerRef, 
    isSwipingBack, 
    swipeProgress 
  };
};
