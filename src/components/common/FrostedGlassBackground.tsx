import React from 'react';

interface FrostedGlassBackgroundProps {
  className?: string;
}

/**
 * FrostedGlassBackground - Unified multi-layer background effect
 * 
 * Provides a consistent frosted glass aesthetic across the app:
 * - Light mode: Warm off-white with subtle gradients and blur
 * - Dark mode: Uses theme's background/40 for authentic glass effect
 * 
 * Usage:
 * <div className="relative">
 *   <FrostedGlassBackground />
 *   <div className="relative z-10">...content...</div>
 * </div>
 */
const FrostedGlassBackground: React.FC<FrostedGlassBackgroundProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 z-0 ${className}`}>
      {/* Warm base - light: off-white, dark: theme background */}
      <div className="absolute inset-0 bg-[#F7F3EC] dark:bg-background" />
      
      {/* Subtle vertical gradient - light mode only */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5] via-[#F7F3EC] to-[#F0EBE3] dark:from-transparent dark:via-transparent dark:to-transparent" />
      
      {/* Faint vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.04)_100%)] dark:opacity-30" />
      
      {/* Frosted glass overlay - the key effect */}
      <div className="absolute inset-0 bg-white/40 dark:bg-background/40 backdrop-blur-xl" />
      
      {/* Subtle grain/noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default FrostedGlassBackground;
