import { useRef, useState, useCallback, useEffect } from 'react';

interface UseSwipeTabsOptions {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  enabled?: boolean;
  threshold?: number; // percentage of screen width (default 0.2 = 20%)
}

interface UseSwipeTabsReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  offset: number;
  isSwiping: boolean;
}

// Find the nearest scrollable parent
const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
  let current = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    if (overflowX === 'auto' || overflowX === 'scroll') {
      if (current.scrollWidth > current.clientWidth) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return null;
};

export const useSwipeTabs = ({
  tabs,
  activeTab,
  onTabChange,
  enabled = true,
  threshold = 0.2,
}: UseSwipeTabsOptions): UseSwipeTabsReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const currentOffset = useRef(0);
  const isActiveSwipe = useRef(false);
  const scrollableParent = useRef<HTMLElement | null>(null);
  const initialScrollLeft = useRef(0);
  const hasDecidedDirection = useRef(false);
  const isHorizontalSwipe = useRef(false);

  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const currentIndex = tabs.indexOf(activeTab);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    currentOffset.current = 0;
    hasDecidedDirection.current = false;
    isHorizontalSwipe.current = false;

    // Check if touch is inside a horizontally scrollable container
    const target = e.target as HTMLElement;
    scrollableParent.current = findScrollableParent(target);
    
    if (scrollableParent.current) {
      initialScrollLeft.current = scrollableParent.current.scrollLeft;
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // First movement: decide if this is a horizontal or vertical swipe
    if (!hasDecidedDirection.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      hasDecidedDirection.current = true;
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      
      // If vertical swipe, don't interfere
      if (!isHorizontalSwipe.current) {
        return;
      }
    }

    // Not yet decided or vertical swipe - don't process
    if (!hasDecidedDirection.current || !isHorizontalSwipe.current) {
      return;
    }

    // Check if inside a scrollable container
    if (scrollableParent.current) {
      const container = scrollableParent.current;
      const atLeftEdge = container.scrollLeft <= 0;
      const atRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

      // Swiping right (deltaX > 0) but not at left edge - let container scroll
      if (deltaX > 0 && !atLeftEdge) {
        return;
      }
      // Swiping left (deltaX < 0) but not at right edge - let container scroll
      if (deltaX < 0 && !atRightEdge) {
        return;
      }
    }

    // Boundary checks for tab navigation
    const isAtFirstTab = currentIndex === 0;
    const isAtLastTab = currentIndex === tabs.length - 1;

    // Don't allow swiping past boundaries (but show rubberband effect)
    if ((deltaX > 0 && isAtFirstTab) || (deltaX < 0 && isAtLastTab)) {
      // Rubberband effect - reduced movement at edges
      currentOffset.current = deltaX * 0.3;
    } else {
      currentOffset.current = deltaX;
    }

    if (!isActiveSwipe.current) {
      isActiveSwipe.current = true;
      setIsSwiping(true);
    }

    setOffset(currentOffset.current);
  }, [enabled, currentIndex, tabs.length]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isActiveSwipe.current) {
      isActiveSwipe.current = false;
      return;
    }

    const screenWidth = window.innerWidth;
    const swipeThreshold = screenWidth * threshold;
    const delta = currentOffset.current;

    // Determine if we should change tabs
    if (Math.abs(delta) > swipeThreshold) {
      if (delta > 0 && currentIndex > 0) {
        // Swiped right - go to previous tab
        onTabChange(tabs[currentIndex - 1]);
      } else if (delta < 0 && currentIndex < tabs.length - 1) {
        // Swiped left - go to next tab
        onTabChange(tabs[currentIndex + 1]);
      }
    }

    // Reset state
    isActiveSwipe.current = false;
    scrollableParent.current = null;
    currentOffset.current = 0;
    setOffset(0);
    setIsSwiping(false);
  }, [enabled, threshold, currentIndex, tabs, onTabChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
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
    offset,
    isSwiping,
  };
};
