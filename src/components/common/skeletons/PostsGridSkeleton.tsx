import { Skeleton } from '@/components/ui/skeleton';

interface PostsGridSkeletonProps {
  count?: number;
}

export const PostsGridSkeleton = ({ count = 4 }: PostsGridSkeletonProps) => {
  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-xl overflow-hidden"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Skeleton className="absolute inset-0" />
            {/* Avatar placeholder */}
            <div className="absolute top-2 left-2">
              <Skeleton className="w-8 h-8 rounded-full" />
            </div>
            {/* Caption placeholder */}
            <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ReviewListSkeletonProps {
  count?: number;
}

export const ReviewListSkeleton = ({ count = 4 }: ReviewListSkeletonProps) => {
  return (
    <div className="px-4 py-4 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 pb-4 border-b border-border last:border-0"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          {/* Avatar */}
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Username + rating */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-8" />
            </div>
            
            {/* Review text */}
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            
            {/* Timestamp */}
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};
