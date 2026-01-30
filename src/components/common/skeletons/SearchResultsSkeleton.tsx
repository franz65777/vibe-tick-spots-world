import { Skeleton } from '@/components/ui/skeleton';

interface SearchResultsSkeletonProps {
  mode?: 'locations' | 'users';
}

const SearchResultsSkeleton = ({ mode = 'locations' }: SearchResultsSkeletonProps) => {
  if (mode === 'users') {
    return (
      <div className="space-y-3 px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResultsSkeleton;
