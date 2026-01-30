import { Skeleton } from '@/components/ui/skeleton';

interface SettingsSkeletonProps {
  rows?: number;
}

const SettingsSkeleton = ({ rows = 3 }: SettingsSkeletonProps) => {
  return (
    <div className="space-y-6 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="space-y-3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Toggle row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <Skeleton className="w-10 h-10 rounded-full" />
              
              {/* Label + description */}
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            
            {/* Toggle switch */}
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          
          {/* Optional sub-options */}
          {i === 0 && (
            <div className="ml-13 p-3 rounded-lg space-y-2">
              <Skeleton className="h-3 w-full max-w-[280px]" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          )}
        </div>
      ))}
      
      {/* Radio options section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        
        {Array.from({ length: 3 }).map((_, j) => (
          <div key={j} className="flex items-center space-x-3 p-2">
            <Skeleton className="w-4 h-4 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsSkeleton;
