import { Skeleton } from '@/components/ui/skeleton';

const TabContentSkeleton = () => {
  return (
    <div className="px-4 py-4">
      {/* Filter dropdown skeleton */}
      <Skeleton className="h-6 w-20 mb-4 rounded-full" />
      
      {/* Grid skeleton with shimmer */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i} 
            className="aspect-square rounded-xl bg-muted relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabContentSkeleton;
