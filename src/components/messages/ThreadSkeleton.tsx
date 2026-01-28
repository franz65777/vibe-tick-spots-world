import { Skeleton } from '@/components/ui/skeleton';

interface ThreadSkeletonProps {
  count?: number;
}

const ThreadSkeleton = ({ count = 6 }: ThreadSkeletonProps) => {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          {/* Avatar */}
          <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between items-center">
              {/* Username */}
              <Skeleton className="h-4 w-24" />
              {/* Time */}
              <Skeleton className="h-3 w-10" />
            </div>
            {/* Message preview */}
            <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThreadSkeleton;
