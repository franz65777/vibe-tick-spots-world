import { Skeleton } from '@/components/ui/skeleton';

interface CommentsSkeletonProps {
  count?: number;
}

const CommentsSkeleton = ({ count = 4 }: CommentsSkeletonProps) => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          {/* Avatar */}
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Username + timestamp */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
            
            {/* Comment text - varying widths */}
            <Skeleton 
              className="h-3.5" 
              style={{ width: `${60 + (i % 3) * 15}%` }} 
            />
            {i % 2 === 0 && (
              <Skeleton className="h-3.5 w-[45%]" />
            )}
            
            {/* Like/Reply actions */}
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentsSkeleton;
