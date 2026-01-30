import { Skeleton } from '@/components/ui/skeleton';

const AnalyticsSkeleton = () => {
  return (
    <div className="h-screen bg-background pb-24 overflow-y-auto">
      <div className="max-w-screen-sm mx-auto px-3 py-3 space-y-3">
        {/* Header */}
        <div>
          <Skeleton className="h-7 w-48 mb-1" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Stats grid - 2x2 */}
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border-0 shadow-md p-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-0 shadow-lg p-4"
            style={{ animationDelay: `${(i + 4) * 75}ms` }}
          >
            {/* Chart header */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            
            {/* Chart placeholder */}
            <div className="h-48 flex items-end justify-between gap-2 px-2">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton
                  key={j}
                  className="flex-1 rounded-t"
                  style={{ 
                    height: `${30 + Math.random() * 60}%`,
                    animationDelay: `${j * 30}ms`
                  }}
                />
              ))}
            </div>
            
            {/* X-axis labels */}
            <div className="flex justify-between mt-2 px-2">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-3 w-8" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsSkeleton;
