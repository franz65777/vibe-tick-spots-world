import { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import MobileNotificationItem from './MobileNotificationItem';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  created_at: string;
  is_read: boolean;
}

interface PrefetchedData {
  loading: boolean;
  getProfile: (userId: string | undefined) => { id: string; username: string; avatar_url: string | null } | null;
  isFollowing: (userId: string | undefined) => boolean;
  hasActiveStory: (userId: string | undefined) => boolean;
  getUserStories: (userId: string | undefined) => any[];
  isCommentLiked: (commentId: string | undefined) => boolean;
  getPostContentType: (postId: string | undefined) => 'review' | 'post';
  isUserPrivate: (userId: string | undefined) => boolean;
  hasPendingRequest: (userId: string | undefined) => boolean;
  isLocationShareActive: (userId: string | undefined, locationId: string | undefined) => boolean;
}

interface VirtualizedNotificationsListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onAction: (notification: Notification) => void;
  onDelete: (id: string) => Promise<any>;
  onRefresh: () => Promise<void>;
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
      className="flex-1 overflow-y-auto"
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
              key={notification.id}
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
