import { useState, useRef, useCallback, useEffect } from 'react';

interface UseScrollHideOptions {
  threshold?: number;
  enabled?: boolean;
}

/**
 * iOS-style hide-on-scroll hook with velocity-based detection
 * 
 * Features:
 * - Velocity-based hiding for smooth, natural feel
 * - RAF-throttled for 60fps performance
 * - Hysteresis to prevent jitter
 * - GPU-accelerated via CSS transforms
 */
export const useScrollHide = (options: UseScrollHideOptions = {}) => {
  const { threshold = 50, enabled = true } = options;
  const [hidden, setHidden] = useState(false);
  
  // Refs for scroll tracking
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const lastScrollY = useRef(0);
  const lastTime = useRef(Date.now());
  const ticking = useRef(false);
  
  // Store options in refs to avoid recreating callbacks
  const optionsRef = useRef({ threshold, enabled });
  optionsRef.current = { threshold, enabled };

  // Velocity-based scroll handler
  const handleScroll = useCallback(() => {
    if (!optionsRef.current.enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollY = container.scrollTop;
    const currentTime = Date.now();
    const timeDelta = Math.max(currentTime - lastTime.current, 1);
    
    // Calculate velocity (px/ms) - positive = scrolling down
    const velocity = (currentScrollY - lastScrollY.current) / timeDelta;
    const currentThreshold = optionsRef.current.threshold;

    // iOS-style behavior:
    // - Hide when scrolling down fast enough AND past threshold
    // - Show immediately when scrolling up OR at top
    if (velocity > 0.3 && currentScrollY > currentThreshold) {
      // Scrolling down fast - hide
      setHidden(true);
    } else if (velocity < -0.2) {
      // Scrolling up - show immediately
      setHidden(false);
    } else if (currentScrollY < 20) {
      // Near top - always show
      setHidden(false);
    }

    lastScrollY.current = currentScrollY;
    lastTime.current = currentTime;
  }, []);

  // RAF-throttled scroll event handler
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
      lastTime.current = Date.now();
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
    lastTime.current = Date.now();
  }, []);

  return {
    hidden,
    setScrollContainer,
    resetHidden,
  };
};
