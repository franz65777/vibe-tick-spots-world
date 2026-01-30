import React, { memo, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationData } from '@/hooks/useNotificationData';
import VirtualizedNotificationsList from '@/components/notifications/VirtualizedNotificationsList';
import { useTranslation } from 'react-i18next';
import InviteFriendOverlay from './InviteFriendOverlay';
import addFriendIcon from '@/assets/icons/add-friend.png';

interface NotificationsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsOverlay = memo(({ isOpen, onClose }: NotificationsOverlayProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refresh } = useNotifications();
  
  // Pre-fetch all notification data in batch (eliminates N+1 queries)
  const notificationData = useNotificationData(notifications);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Ref to track if this overlay set the data-modal-open attribute
  const didSetModalOpenRef = useRef(false);
  
  // Mark all as read when overlay opens and whenever there are unread notifications
  useEffect(() => {
    if (isOpen && !loading && notifications.length > 0 && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loading, notifications.length, unreadCount, markAllAsRead]);

  // Manage data-modal-open and visibility animation
  useEffect(() => {
    if (isOpen) {
      didSetModalOpenRef.current = true;
      document.body.setAttribute('data-modal-open', 'true');
      window.dispatchEvent(new CustomEvent('ui:overlay-open'));
      // Close other overlays to prevent stacking
      window.dispatchEvent(new CustomEvent('close-search-drawer'));
      window.dispatchEvent(new CustomEvent('close-filter-dropdown'));
      window.dispatchEvent(new CustomEvent('close-city-selector'));
      window.dispatchEvent(new CustomEvent('close-list-view'));
      // Trigger fade-in animation
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      if (didSetModalOpenRef.current) {
        didSetModalOpenRef.current = false;
        document.body.removeAttribute('data-modal-open');
        window.dispatchEvent(new CustomEvent('ui:overlay-close'));
      }
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (didSetModalOpenRef.current) {
        document.body.removeAttribute('data-modal-open');
        window.dispatchEvent(new CustomEvent('ui:overlay-close'));
      }
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const closeOverlaySync = useCallback(() => {
    // Force the overlay to unmount BEFORE any route navigation, to avoid it
    // remaining visually on top due to stacking/portal timing.
    flushSync(() => onClose());
  }, [onClose]);

  const navigateWithClose = useCallback(
    (to: string, options?: any) => {
      closeOverlaySync();
      navigate(to, options);
    },
    [closeOverlaySync, navigate]
  );

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Support explicit navigation requests coming from child components
    if (notification?.__nav?.kind === 'profile' && notification.__nav.userId) {
      navigateWithClose(`/profile/${notification.__nav.userId}`);
      return;
    }
    if (notification?.__nav?.kind === 'post' && notification.__nav.postId) {
      navigateWithClose(`/post/${notification.__nav.postId}`, { state: { fromNotifications: true } });
      return;
    }
    if (notification?.__nav?.kind === 'home_open_location' && notification.__nav.locationId) {
      navigateWithClose('/', {
        state: {
          openLocationId: notification.__nav.locationId,
          fromNotifications: true,
        },
      });
      return;
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'follow':
        if (notification.data?.user_id) {
          navigateWithClose(`/profile/${notification.data.user_id}`);
        }
        break;
      case 'like':
      case 'comment':
        if (notification.data?.post_id) {
          navigateWithClose(`/post/${notification.data.post_id}`, { state: { fromNotifications: true } });
        }
        break;
      case 'location_share':
        if (notification.data?.location_id) {
          navigateWithClose('/', {
            state: {
              openLocationId: notification.data.location_id,
              fromNotifications: true,
            },
          });
        }
        break;
      case 'story_like':
        navigateWithClose(`/profile`);
        break;
      case 'story_reply':
        if (notification.data?.user_id) {
          closeOverlaySync();
          // Open messages overlay with this user
          window.dispatchEvent(new CustomEvent('open-messages-overlay', { 
            detail: { userId: notification.data.user_id } 
          }));
        }
        break;
      default:
        closeOverlaySync();
        break;
    }
  };

  // Group notifications: likes by post, dedupe identical ones
  const groupedNotifications = useMemo(() => {
    const likeGroups = new Map<string, any>();
    const others: any[] = [];

    for (const n of notifications) {
      if (n.type === 'like' && n.data?.post_id) {
        const groupKey = `like:${n.data.post_id}`;
        const userInfo = {
          id: n.data?.user_id || '',
          name: n.data?.user_name || n.data?.username || 'User',
          avatar: n.data?.user_avatar || n.data?.avatar_url || ''
        };
        const existing = likeGroups.get(groupKey);
        if (existing) {
          if (userInfo.id && !existing.data.grouped_users.find((u: any) => u.id === userInfo.id)) {
            existing.data.grouped_users.push(userInfo);
          }
          existing.data.total_count += 1;
          existing.data.grouped_notification_ids.push(n.id);
          if (new Date(n.created_at) > new Date(existing.created_at)) existing.created_at = n.created_at;
          existing.is_read = existing.is_read && n.is_read;
        } else {
          likeGroups.set(groupKey, {
            ...n,
            __groupKey: groupKey,
            data: {
              ...n.data,
              grouped_users: [userInfo],
              total_count: 1,
              grouped_notification_ids: [n.id],
            }
          });
        }
      } else {
        // dedupe exact duplicates
        const dupKey = `${n.type}:${n.data?.user_id || ''}:${n.data?.post_id || ''}:${n.data?.comment_id || ''}:${n.message}`;
        if (!others.find(o => (o as any).__dupKey === dupKey)) {
          (n as any).__dupKey = dupKey;
          others.push(n);
        }
      }
    }

    const grouped = [...Array.from(likeGroups.values()), ...others];
    grouped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return grouped;
  }, [notifications]);

  if (!isOpen) return null;

  const overlay = (
    <div className={`fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl transition-all duration-200 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <header 
        className="sticky top-0 z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="py-3 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-xl text-foreground">{t('title', { ns: 'notifications' })}</h1>
          </div>
          
          {/* Invite Friend Button */}
          <button
            onClick={() => setIsInviteOpen(true)}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            aria-label={t('inviteFriend', { ns: 'invite', defaultValue: 'Invite a Friend' })}
          >
            <img src={addFriendIcon} alt="" className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-muted-foreground text-sm">Loading notifications…</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">All caught up!</h3>
            <p className="text-muted-foreground text-sm">No new notifications</p>
          </div>
        ) : (
          <VirtualizedNotificationsList
            notifications={groupedNotifications}
            onMarkAsRead={handleMarkAsRead}
            onAction={handleNotificationClick}
            onRefresh={refresh}
            onDelete={async (id) => {
              const notification = groupedNotifications.find(n => n.id === id || (n as any).__groupKey === id);
              const ids: string[] = notification?.data?.grouped_notification_ids || [id];
              const results = await Promise.all(ids.map((nid) => deleteNotification(nid)));
              const failed = results.find((r) => !r.success);
              return failed || { success: true };
            }}
            openSwipeId={openSwipeId}
            onSwipeOpen={setOpenSwipeId}
            prefetchedData={notificationData}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {createPortal(overlay, document.body)}
      <InviteFriendOverlay isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </>
  );
});

NotificationsOverlay.displayName = 'NotificationsOverlay';

export default NotificationsOverlay;
