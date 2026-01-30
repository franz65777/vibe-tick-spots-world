import { Skeleton } from '@/components/ui/skeleton';

const PostDetailSkeleton = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
        <div className="relative bg-background rounded-none md:rounded-2xl w-full h-full md:h-auto md:max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
          
          {/* Left: Media Section Skeleton */}
          <div className="relative flex-shrink-0 w-full md:w-[60%] bg-muted/30 flex items-center justify-center">
            <Skeleton className="w-full h-full min-h-[300px] md:min-h-[500px]" />
          </div>

          {/* Right: Content Section Skeleton */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            {/* Header Skeleton */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>

            {/* Content Area Skeleton */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Caption Skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>

              {/* Engagement Stats Skeleton */}
              <div className="flex items-center gap-4 py-2">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>

              {/* Comments Skeleton */}
              <div className="space-y-3 pt-4 border-t border-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-full max-w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailSkeleton;
