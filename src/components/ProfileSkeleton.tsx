import { Skeleton } from './ui/skeleton';

const ProfileSkeleton = () => {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header skeleton */}
      <div className="py-4 bg-background">
        <div className="flex gap-4 px-3">
          {/* Avatar skeleton */}
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          
          {/* Stats skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            
            <div className="flex gap-4 mb-2">
              <div className="text-center">
                <Skeleton className="h-4 w-8 mb-1" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="text-center">
                <Skeleton className="h-4 w-8 mb-1" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="text-center">
                <Skeleton className="h-4 w-8 mb-1" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
      
      {/* Tabs skeleton */}
      <div className="flex border-b border-border">
        <Skeleton className="h-10 flex-1 mx-1" />
        <Skeleton className="h-10 flex-1 mx-1" />
        <Skeleton className="h-10 flex-1 mx-1" />
        <Skeleton className="h-10 flex-1 mx-1" />
      </div>
      
      {/* Posts grid skeleton */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
