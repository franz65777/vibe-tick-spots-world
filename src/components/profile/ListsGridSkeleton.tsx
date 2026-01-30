import { Skeleton } from '@/components/ui/skeleton';

const ListsGridSkeleton = () => {
  return (
    <div className="px-4 pt-1">
      {/* Row 1: "My Lists" section */}
      <Skeleton className="h-4 w-16 mb-2 rounded" />
      <div className="flex gap-3 overflow-x-hidden pb-2 mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i}
            className="shrink-0 w-36 aspect-[4/5] rounded-2xl bg-muted relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            {/* Bottom text placeholder */}
            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
              <div className="bg-white/20 rounded h-3 w-20" />
              <div className="bg-white/15 rounded h-2 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: "Saved Lists" section placeholder */}
      <Skeleton className="h-4 w-20 mb-2 rounded" />
      <div className="flex gap-3 overflow-x-hidden pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div 
            key={i}
            className="shrink-0 w-36 aspect-[4/5] rounded-2xl bg-muted relative overflow-hidden"
          >
            <div 
              className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              style={{ animationDelay: `${(i + 4) * 100}ms` }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
              <div className="bg-white/20 rounded h-3 w-20" />
              <div className="bg-white/15 rounded h-2 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListsGridSkeleton;
