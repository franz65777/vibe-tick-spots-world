import React, { useRef, memo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { MessageThread } from '@/services/messageService';
import { useTranslation } from 'react-i18next';
import ThreadSkeleton from './ThreadSkeleton';

interface VirtualizedThreadListProps {
  threads: MessageThread[];
  loading: boolean;
  userId: string | undefined;
  unreadCounts: Record<string, number>;
  hasActiveStoryInThread: Record<string, boolean>;
  onThreadSelect: (thread: MessageThread) => void;
  onAvatarClick: (thread: MessageThread) => void;
  onNewMessage: () => void;
  formatMessageTime: (timestamp: string) => string;
  getOtherParticipant: (thread: MessageThread) => any;
}

// Memoized thread item to prevent unnecessary re-renders
const ThreadItem = memo(({ 
  thread, 
  userId, 
  unreadCount,
  hasActiveStory,
  onSelect, 
  onAvatarClick,
  formatTime,
  getOtherParticipant,
  t,
}: {
  thread: MessageThread;
  userId: string | undefined;
  unreadCount: number;
  hasActiveStory: boolean;
  onSelect: () => void;
  onAvatarClick: (e: React.MouseEvent) => void;
  formatTime: (timestamp: string) => string;
  getOtherParticipant: (thread: MessageThread) => any;
  t: (key: string, options?: any) => string;
}) => {
  const otherParticipant = getOtherParticipant(thread);
  if (!otherParticipant) return null;
  
  const lastMessage = thread.last_message;
  const isMyMessage = lastMessage?.sender_id === userId;
  const isStoryReply = lastMessage?.message_type === 'story_reply';
  const isStoryShare = lastMessage?.message_type === 'story_share';

  // Format message preview
  let messagePreview = '';
  if (isStoryReply && !isMyMessage) {
    messagePreview = t('repliedToYourStory', { ns: 'messages' });
  } else if (isStoryShare) {
    messagePreview = t('sharedAStory', { ns: 'messages' });
  } else if (unreadCount > 1) {
    messagePreview = t('newMessages', { ns: 'messages', count: unreadCount });
  } else if (lastMessage?.message_type === 'audio') {
    messagePreview = t('audioMessage', { ns: 'messages' });
  } else if (lastMessage?.message_type === 'place_share') {
    messagePreview = t('sharedAPlace', { ns: 'messages' });
  } else if (lastMessage?.message_type === 'post_share') {
    messagePreview = t('sharedAPost', { ns: 'messages' });
  } else if (lastMessage?.message_type === 'profile_share') {
    messagePreview = t('sharedAProfile', { ns: 'messages' });
  } else if (lastMessage?.message_type === 'folder_share') {
    messagePreview = t('sharedAList', { ns: 'messages' });
  } else if (lastMessage?.message_type === 'trip_share') {
    messagePreview = t('sharedATrip', { ns: 'messages' });
  } else if (lastMessage?.content) {
    const content = lastMessage.content;
    messagePreview = content.length > 30 ? `${content.substring(0, 30)}...` : content;
  } else {
    messagePreview = t('startConversation', { ns: 'messages' });
  }

  // Message status for sent messages
  let statusText = '';
  if (isMyMessage && !isStoryReply && !isStoryShare) {
    statusText = lastMessage?.is_read 
      ? t('viewed', { ns: 'messages' }) 
      : t('sent', { ns: 'messages' });
  }

  return (
    <button 
      onClick={onSelect} 
      className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors"
    >
      <button onClick={onAvatarClick} className="flex-shrink-0">
        <Avatar className={`w-14 h-14 border-2 ${hasActiveStory ? 'border-primary' : 'border-background'}`}>
          <AvatarImage src={otherParticipant.avatar_url} />
          <AvatarFallback>{otherParticipant.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </button>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex justify-between items-end mb-1">
          <p className="font-semibold text-base text-foreground truncate">
            {otherParticipant.username}
          </p>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {thread.last_message_at && formatTime(thread.last_message_at)}
            </span>
            {unreadCount > 0 && (
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-primary-foreground font-bold">
                  {unreadCount}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground truncate">
            {isStoryReply || lastMessage?.message_type === 'audio' ? (
              <span className="font-semibold">{messagePreview}</span>
            ) : lastMessage?.content ? (
              <>
                <span className="font-semibold">
                  {lastMessage.content.substring(0, Math.min(20, lastMessage.content.length))}
                </span>
                {lastMessage.content.length > 20 && '...'}
              </>
            ) : (
              messagePreview
            )}
          </p>
          {statusText && <span className="text-xs text-muted-foreground">· {statusText}</span>}
        </div>
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if meaningful data changes
  return (
    prevProps.thread.id === nextProps.thread.id &&
    prevProps.thread.last_message?.id === nextProps.thread.last_message?.id &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.hasActiveStory === nextProps.hasActiveStory
  );
});

ThreadItem.displayName = 'ThreadItem';

const VirtualizedThreadList = ({
  threads,
  loading,
  userId,
  unreadCounts,
  hasActiveStoryInThread,
  onThreadSelect,
  onAvatarClick,
  onNewMessage,
  formatMessageTime,
  getOtherParticipant,
}: VirtualizedThreadListProps) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height of each thread item
    overscan: 5,
  });

  // Use skeleton UI instead of spinner for better perceived performance
  if (loading) {
    return <ThreadSkeleton count={6} />;
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
          <MessageSquare className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">
          {t('noMessages', { ns: 'messages' })}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {t('startConversation', { ns: 'messages' })}
        </p>
        <Button onClick={onNewMessage} size="sm">
          {t('newMessage', { ns: 'messages' })}
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-full overflow-auto scrollbar-hide"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const thread = threads[virtualRow.index];
          const otherParticipant = getOtherParticipant(thread);
          const otherId = otherParticipant?.id;
          
          return (
            <div
              key={thread.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ThreadItem
                thread={thread}
                userId={userId}
                unreadCount={otherId ? unreadCounts[otherId] || 0 : 0}
                hasActiveStory={otherId ? hasActiveStoryInThread[otherId] || false : false}
                onSelect={() => onThreadSelect(thread)}
                onAvatarClick={(e) => {
                  e.stopPropagation();
                  onAvatarClick(thread);
                }}
                formatTime={formatMessageTime}
                getOtherParticipant={getOtherParticipant}
                t={t}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(VirtualizedThreadList);
