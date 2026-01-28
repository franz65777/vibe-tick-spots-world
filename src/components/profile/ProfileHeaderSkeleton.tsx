import { Skeleton } from '@/components/ui/skeleton';

const ProfileHeaderSkeleton = () => {
  return (
    <div className="pt-1 pb-2 bg-background animate-pulse">
      {/* Main row: Avatar + Name/Stats + Badges + Settings */}
      <div className="flex items-start gap-3 px-3">
        {/* Avatar skeleton */}
        <div className="shrink-0">
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>

        {/* Middle: Name and Stats */}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-5 w-24 mt-2" />
          
          {/* Stats Row */}
          <div className="flex gap-3 mt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Right: Badges + Settings */}
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>

      {/* Category Cards Section */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Skeleton className="h-12 w-28 rounded-xl shrink-0" />
          <Skeleton className="h-12 w-28 rounded-xl shrink-0" />
          <Skeleton className="h-12 w-28 rounded-xl shrink-0" />
          <Skeleton className="h-12 w-28 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default ProfileHeaderSkeleton;
