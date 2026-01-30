import { Skeleton } from '@/components/ui/skeleton';

interface NotificationsSkeletonProps {
  count?: number;
}

const NotificationsSkeleton = ({ count = 5 }: NotificationsSkeletonProps) => {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-xl"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Avatar */}
          <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title + timestamp row */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            
            {/* Message text */}
            <Skeleton className="h-3.5 w-full max-w-[200px]" />
            
            {/* Optional action button placeholder */}
            {i % 3 === 0 && (
              <Skeleton className="h-7 w-16 rounded-full mt-1" />
            )}
          </div>
          
          {/* Right indicator dot */}
          {i % 2 === 0 && (
            <Skeleton className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationsSkeleton;
