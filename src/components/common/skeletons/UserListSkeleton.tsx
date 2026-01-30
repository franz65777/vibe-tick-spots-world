import { Skeleton } from '@/components/ui/skeleton';

interface UserListSkeletonProps {
  count?: number;
  showButton?: boolean;
}

const UserListSkeleton = ({ count = 6, showButton = true }: UserListSkeletonProps) => {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Skeleton className="w-10 h-10 rounded-full" />
            
            {/* Name + username */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          
          {/* Action button */}
          {showButton && (
            <Skeleton className="h-8 w-16 rounded-full" />
          )}
        </div>
      ))}
    </div>
  );
};

export default UserListSkeleton;
