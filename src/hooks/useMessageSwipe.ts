import { useState, useRef, useCallback } from 'react';
import { haptics } from '@/utils/haptics';

interface UseMessageSwipeOptions {
  isOwnMessage: boolean;
  threshold?: number;
  onReply: () => void;
  enabled?: boolean;
}

export const useMessageSwipe = ({
  isOwnMessage,
  threshold = 60,
  onReply,
  enabled = true
}: UseMessageSwipeOptions) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const hasTriggeredHaptic = useRef(false);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    hasTriggeredHaptic.current = false;
  }, [enabled]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // Determine swipe direction on first significant move
    if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // Only process horizontal swipes
    if (!isHorizontalSwipe.current) return;
    
    // For received messages: swipe RIGHT (positive deltaX)
    // For sent messages: swipe LEFT (negative deltaX)
    let newOffset = 0;
    if (isOwnMessage) {
      // Sent message - swipe left (negative delta)
      if (deltaX < 0) {
        newOffset = Math.max(deltaX, -threshold * 1.5);
      }
    } else {
      // Received message - swipe right (positive delta)
      if (deltaX > 0) {
        newOffset = Math.min(deltaX, threshold * 1.5);
      }
    }
    
    setSwipeOffset(newOffset);
    
    // Trigger haptic feedback when crossing threshold
    if (Math.abs(newOffset) >= threshold && !hasTriggeredHaptic.current) {
      haptics.impact('medium');
      hasTriggeredHaptic.current = true;
    } else if (Math.abs(newOffset) < threshold && hasTriggeredHaptic.current) {
      hasTriggeredHaptic.current = false;
    }
  }, [enabled, isOwnMessage, threshold]);
  
  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    
    const absOffset = Math.abs(swipeOffset);
    if (absOffset >= threshold) {
      onReply();
      haptics.success();
    }
    
    setSwipeOffset(0);
    isHorizontalSwipe.current = null;
    hasTriggeredHaptic.current = false;
  }, [enabled, swipeOffset, threshold, onReply]);
  
  return {
    swipeOffset,
    showReplyIndicator: Math.abs(swipeOffset) >= threshold * 0.5,
    progress: Math.min(Math.abs(swipeOffset) / threshold, 1),
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd
    }
  };
};
