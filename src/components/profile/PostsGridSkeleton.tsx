import { Skeleton } from '@/components/ui/skeleton';

const PostsGridSkeleton = () => {
  return (
    <div className="w-full">
      {/* Filter dropdown skeleton */}
      <Skeleton className="h-6 w-20 mb-4 rounded-full" />
      
      {/* Grid with shimmer */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i} 
            className="relative aspect-square rounded-xl overflow-hidden bg-muted"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Shimmer overlay */}
            <div 
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            
            {/* Random multi-image badge placeholder */}
            {i % 3 === 0 && (
              <div className="absolute top-2 right-2 bg-muted-foreground/20 backdrop-blur-sm rounded-full w-8 h-5" />
            )}
            
            {/* Bottom overlay skeleton mimicking hover state */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-muted-foreground/10 to-transparent">
              <div className="flex gap-2">
                <div className="bg-muted-foreground/20 rounded-full w-10 h-5" />
                <div className="bg-muted-foreground/20 rounded-full w-10 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostsGridSkeleton;
