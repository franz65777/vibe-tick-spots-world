import { Skeleton } from '@/components/ui/skeleton';

interface MessageSkeletonProps {
  count?: number;
}

const MessageSkeleton = ({ count = 5 }: MessageSkeletonProps) => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => {
        // Alternate between left (received) and right (sent) messages
        const isOwn = i % 3 === 0;
        
        return (
          <div
            key={i}
            className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar - only for received messages */}
            {!isOwn && (
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            )}
            
            {/* Message bubble */}
            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
              <Skeleton 
                className={`h-12 rounded-2xl ${
                  isOwn ? 'w-32' : i % 2 === 0 ? 'w-48' : 'w-36'
                }`}
              />
              {/* Timestamp */}
              <Skeleton className="h-3 w-12 mt-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageSkeleton;
