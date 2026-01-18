import { useState, useEffect, useCallback } from 'react';

interface KeyboardState {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  viewportHeight: number;
}

export const useKeyboardHeight = (): KeyboardState => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  const handleResize = useCallback(() => {
    const visualViewport = window.visualViewport;
    
    if (visualViewport) {
      // Calculate keyboard height from visual viewport
      const currentHeight = window.innerHeight - visualViewport.height;
      const adjustedHeight = Math.max(0, currentHeight);
      
      setKeyboardHeight(adjustedHeight);
      setIsKeyboardOpen(adjustedHeight > 100); // Threshold to distinguish from normal resize
      setViewportHeight(visualViewport.height);
    } else {
      // Fallback for browsers without visualViewport API
      setViewportHeight(window.innerHeight);
    }
  }, []);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    // Initial measurement
    handleResize();

    if (visualViewport) {
      visualViewport.addEventListener('resize', handleResize);
      visualViewport.addEventListener('scroll', handleResize);
      
      return () => {
        visualViewport.removeEventListener('resize', handleResize);
        visualViewport.removeEventListener('scroll', handleResize);
      };
    } else {
      // Fallback to window resize
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [handleResize]);

  return { keyboardHeight, isKeyboardOpen, viewportHeight };
};
