import { Skeleton } from '@/components/ui/skeleton';
import FrostedGlassBackground from '@/components/common/FrostedGlassBackground';

const UserProfileSkeleton = () => {
  return (
    <div className="relative flex flex-col h-full pt-[env(safe-area-inset-top)]">
      <FrostedGlassBackground />
      <div className="relative z-10 flex flex-col h-full">
        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3 flex-1">
            {/* Back arrow */}
            <Skeleton className="w-6 h-6 rounded" />
            {/* Username */}
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex items-center gap-2">
            {/* Follow button */}
            <Skeleton className="h-9 w-20 rounded-full" />
            {/* Message button */}
            <Skeleton className="h-9 w-9 rounded-full" />
            {/* More options */}
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Profile Header skeleton */}
        <div className="px-4 py-1">
          {/* Avatar and Stats Row */}
          <div className="flex items-start gap-3 mb-2">
            {/* Avatar */}
            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
            
            {/* Middle: Username and Stats */}
            <div className="flex-1 min-w-0">
              {/* Username */}
              <Skeleton className="h-5 w-24 mt-2" />
              
              {/* Stats Row - Horizontal layout */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>

            {/* Badge placeholder */}
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          </div>

          {/* Bio skeleton */}
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Category Cards Row skeleton */}
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 min-w-[72px] rounded-xl bg-muted/50 p-3 relative overflow-hidden"
              >
                <Skeleton className="w-8 h-8 rounded-lg mb-2" />
                <Skeleton className="h-5 w-6 mb-1" />
                <Skeleton className="h-3 w-12" />
                {/* Shimmer overlay */}
                <div 
                  className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex border-b border-border">
          <Skeleton className="h-10 flex-1 mx-1" />
          <Skeleton className="h-10 flex-1 mx-1" />
          <Skeleton className="h-10 flex-1 mx-1" />
          <Skeleton className="h-10 flex-1 mx-1" />
        </div>

        {/* Posts grid skeleton with shimmer */}
        <div className="px-4 pt-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
      </div>
    </div>
  );
};

export default UserProfileSkeleton;
