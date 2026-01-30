import { Skeleton } from '@/components/ui/skeleton';

interface AvatarGridSkeletonProps {
  count?: number;
}

const AvatarGridSkeleton = ({ count = 4 }: AvatarGridSkeletonProps) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Avatar */}
          <Skeleton className="w-16 h-16 rounded-full" />
          {/* Username */}
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
};

export default AvatarGridSkeleton;
