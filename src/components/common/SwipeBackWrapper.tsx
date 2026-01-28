import React from 'react';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface SwipeBackWrapperProps {
  children: React.ReactNode;
  onBack: () => void;
  enabled?: boolean;
  className?: string;
}

export const SwipeBackWrapper: React.FC<SwipeBackWrapperProps> = ({
  children,
  onBack,
  enabled = true,
  className
}) => {
  const isMobile = useIsMobile();
  
  // Only enable swipe on mobile devices
  const isEnabled = enabled && isMobile;
  
  const { containerRef, isSwipingBack, swipeProgress } = useSwipeBack(onBack, {
    enabled: isEnabled,
    edgeWidth: 30,
    threshold: 80
  });

  return (
    <div 
      ref={containerRef} 
      className={cn("relative h-full w-full overflow-hidden", className)}
    >
      {/* Left edge indicator */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-10 z-50 pointer-events-none",
          "flex items-center justify-center",
          "transition-opacity duration-150",
          isSwipingBack ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `linear-gradient(to right, hsl(var(--background) / ${swipeProgress * 0.6}), transparent)`
        }}
      >
        <div 
          className="bg-muted/80 backdrop-blur-sm rounded-full p-1.5 shadow-lg"
          style={{
            opacity: swipeProgress,
            transform: `translateX(${swipeProgress * 20 - 20}px) scale(${0.5 + swipeProgress * 0.5})`
          }}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </div>
      </div>

      {/* Content with subtle transform */}
      <div 
        className="h-full w-full"
        style={{
          transform: isSwipingBack ? `translateX(${swipeProgress * 30}px)` : 'none',
          transition: isSwipingBack ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>

      {/* Right shadow overlay during swipe */}
      {isSwipingBack && swipeProgress > 0.1 && (
        <div 
          className="absolute inset-0 pointer-events-none z-40"
          style={{
            background: `linear-gradient(to right, hsl(var(--background) / ${swipeProgress * 0.3}), transparent 30%)`
          }}
        />
      )}
    </div>
  );
};

export default SwipeBackWrapper;
