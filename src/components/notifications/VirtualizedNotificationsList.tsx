import { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import MobileNotificationItem from './MobileNotificationItem';
import { PrefetchedData } from '@/hooks/useNotificationData';

interface VirtualizedNotificationsListProps {
  notifications: any[]; // Use any to match the flexible MobileNotificationItem props
  onMarkAsRead: (id: string) => void;
  onAction: (notification: any) => void;
  onDelete: (id: string) => Promise<any>;
  onRefresh: () => void | Promise<void>;
  openSwipeId: string | null;
  onSwipeOpen: (id: string | null) => void;
  prefetchedData?: PrefetchedData;
}

const VirtualizedNotificationsList = memo(({
  notifications,
  onMarkAsRead,
  onAction,
  onDelete,
  onRefresh,
  openSwipeId,
  onSwipeOpen,
  prefetchedData
}: VirtualizedNotificationsListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated height of each notification item
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-y-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const notification = notifications[virtualItem.index];
          return (
            <div
              key={(notification as any).__groupKey || notification.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
            >
              <MobileNotificationItem
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onAction={onAction}
                onDelete={onDelete}
                onRefresh={onRefresh}
                openSwipeId={openSwipeId}
                onSwipeOpen={onSwipeOpen}
                prefetchedData={prefetchedData}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedNotificationsList.displayName = 'VirtualizedNotificationsList';

export default VirtualizedNotificationsList;
