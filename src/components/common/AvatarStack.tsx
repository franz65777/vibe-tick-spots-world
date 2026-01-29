import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarStackProps {
  avatars: { url?: string | null; name?: string }[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const ringColors = [
  'ring-pink-400',
  'ring-blue-400', 
  'ring-green-400',
  'ring-yellow-400',
  'ring-purple-400',
];

const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars,
  max = 3,
  size = 'md',
  className,
}) => {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn('flex items-center', className)}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className={cn(
            sizeClasses[size],
            'rounded-full ring-2 ring-offset-2 ring-offset-background overflow-hidden',
            ringColors[index % ringColors.length],
            index > 0 && '-ml-3'
          )}
        >
          {avatar.url ? (
            <img
              src={avatar.url}
              alt={avatar.name || 'User avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              {avatar.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-full ring-2 ring-offset-2 ring-offset-background bg-muted flex items-center justify-center -ml-3',
            'ring-muted-foreground/30'
          )}
        >
          <span className="text-xs font-medium text-muted-foreground">
            +{remaining}
          </span>
        </div>
      )}
    </div>
  );
};

export default AvatarStack;
