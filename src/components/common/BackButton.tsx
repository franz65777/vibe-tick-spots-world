import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'default' | 'blur' | 'solid';
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label,
  variant = 'default',
  className
}) => {
  const handleClick = () => {
    haptics.impact('light');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-0.5 transition-all duration-150",
        "active:scale-[0.95] active:opacity-70",
        variant === 'blur' && "px-2.5 py-1.5 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-md shadow-sm border border-white/30 dark:border-white/10",
        variant === 'solid' && "px-2.5 py-1.5 rounded-full bg-muted/80 shadow-sm",
        variant === 'default' && "p-2 -ml-2 rounded-full hover:bg-muted/50",
        className
      )}
      aria-label="Go back"
    >
      <ChevronLeft className={cn(
        "text-foreground transition-transform",
        variant === 'default' ? "w-6 h-6" : "w-5 h-5"
      )} />
      {label && (
        <span className="text-sm font-medium text-foreground pr-1">{label}</span>
      )}
    </button>
  );
};

export default BackButton;
