import { useState, useEffect, useRef, useCallback } from 'react';

interface UseScrollHideOptions {
  threshold?: number;
  enabled?: boolean;
}

export const useScrollHide = (options: UseScrollHideOptions = {}) => {
  const { threshold = 50, enabled = true } = options;
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  
  // Store options in refs to avoid recreating callbacks
  const optionsRef = useRef({ threshold, enabled });
  optionsRef.current = { threshold, enabled };

  // Stable scroll handler that reads from refs
  const handleScroll = useCallback(() => {
    if (!optionsRef.current.enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollY = container.scrollTop;
    const delta = currentScrollY - lastScrollY.current;
    const currentThreshold = optionsRef.current.threshold;

    // Only update state if there's a meaningful change
    // Scrolling down - hide after threshold
    if (delta > 5 && currentScrollY > currentThreshold) {
      setHidden(prev => prev ? prev : true);
    }
    // Scrolling up - show immediately (with small threshold to avoid jitter)
    else if (delta < -5) {
      setHidden(prev => prev ? false : prev);
    }

    lastScrollY.current = currentScrollY;
  }, []);

  // Stable scroll event handler with RAF throttling
  const onScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        handleScroll();
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [handleScroll]);

  // Set scroll container - stable callback
  const setScrollContainer = useCallback((element: HTMLElement | null) => {
    // Remove old listener
    if (scrollContainerRef.current && scrollContainerRef.current !== element) {
      scrollContainerRef.current.removeEventListener('scroll', onScroll);
    }

    scrollContainerRef.current = element;

    // Add new listener
    if (element) {
      element.addEventListener('scroll', onScroll, { passive: true });
      // Reset scroll position tracking when container changes
      lastScrollY.current = element.scrollTop;
    }
  }, [onScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener('scroll', onScroll);
      }
    };
  }, [onScroll]);

  // Reset hidden state when tab changes
  const resetHidden = useCallback(() => {
    setHidden(false);
    lastScrollY.current = 0;
  }, []);

  return {
    hidden,
    setScrollContainer,
    resetHidden,
  };
};
