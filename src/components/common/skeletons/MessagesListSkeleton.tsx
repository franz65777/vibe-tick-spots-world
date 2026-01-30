import { Skeleton } from '@/components/ui/skeleton';

interface MessagesListSkeletonProps {
  count?: number;
}

const MessagesListSkeleton = ({ count = 6 }: MessagesListSkeletonProps) => {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Avatar */}
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Username + timestamp row */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            {/* Message preview */}
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessagesListSkeleton;
