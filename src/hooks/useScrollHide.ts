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

  const handleScroll = useCallback(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollY = container.scrollTop;
    const delta = currentScrollY - lastScrollY.current;

    // Scrolling down - hide after threshold
    if (delta > 0 && currentScrollY > threshold) {
      setHidden(true);
    }
    // Scrolling up - show immediately
    else if (delta < 0) {
      setHidden(false);
    }

    lastScrollY.current = currentScrollY;
  }, [enabled, threshold]);

  const onScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        handleScroll();
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [handleScroll]);

  const setScrollContainer = useCallback((element: HTMLElement | null) => {
    // Remove old listener
    if (scrollContainerRef.current) {
      scrollContainerRef.current.removeEventListener('scroll', onScroll);
    }

    scrollContainerRef.current = element;

    // Add new listener
    if (element) {
      element.addEventListener('scroll', onScroll, { passive: true });
    }
  }, [onScroll]);

  // Cleanup
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
