import React, { useRef, memo, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DirectMessage } from '@/services/messageService';
import PlaceMessageCard from './PlaceMessageCard';
import PostMessageCard from './PostMessageCard';
import ProfileMessageCard from './ProfileMessageCard';
import StoryMessageCard from './StoryMessageCard';
import FolderMessageCard from './FolderMessageCard';
import TripMessageCard from './TripMessageCard';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface MessageReaction {
  emoji: string;
  user_id: string;
}

interface VirtualizedMessageListProps {
  messages: DirectMessage[];
  loading: boolean;
  userId: string | undefined;
  hiddenMessageIds: string[];
  messageReactions: Record<string, MessageReaction[]>;
  otherUserProfile: any;
  otherParticipantId: string | undefined;
  formatMessageTime: (timestamp: string) => string;
  onLongPressStart: (messageId: string) => void;
  onLongPressEnd: () => void;
  onDoubleTap: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onViewPlace?: (placeData: any, otherUserId: string) => void;
}

// Memoized message bubble component
const MessageBubble = memo(({
  message,
  isOwn,
  userId,
  otherUserProfile,
  otherParticipantId,
  reactions,
  formatTime,
  onLongPressStart,
  onLongPressEnd,
  onDoubleTap,
  onToggleReaction,
  onViewPlace,
  t,
  navigate,
}: {
  message: DirectMessage;
  isOwn: boolean;
  userId: string | undefined;
  otherUserProfile: any;
  otherParticipantId: string | undefined;
  reactions: MessageReaction[];
  formatTime: (timestamp: string) => string;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onDoubleTap: () => void;
  onToggleReaction: (emoji: string) => void;
  onViewPlace?: (placeData: any, otherUserId: string) => void;
  t: (key: string, options?: any) => string;
  navigate: (path: string, options?: any) => void;
}) => {
  const messageInteractionProps = {
    onTouchStart: onLongPressStart,
    onTouchEnd: onLongPressEnd,
    onMouseDown: onLongPressStart,
    onMouseUp: onLongPressEnd,
    onMouseLeave: onLongPressEnd,
    onClick: onDoubleTap,
  };

  const renderReactions = () => {
    if (!reactions?.length) return null;
    return (
      <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-background/95 rounded-full px-1.5 py-0.5 shadow-sm border border-border">
        {reactions.map((reaction, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(reaction.emoji);
            }}
            className="text-sm leading-none hover:scale-110 transition-transform"
          >
            {reaction.emoji}
          </button>
        ))}
      </div>
    );
  };

  const renderTimestamp = () => (
    <p className={`text-xs text-muted-foreground px-2 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
      {formatTime(message.created_at!)}
    </p>
  );

  // Audio message
  if (message.message_type === 'audio' && message.shared_content?.audio_url) {
    return (
      <div className="w-full" {...messageInteractionProps}>
        <div className={`rounded-2xl px-3 py-2.5 relative ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
              <svg className={`w-5 h-5 ${isOwn ? 'text-primary-foreground' : 'text-primary'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
              </svg>
            </div>
            <audio controls className="flex-1 h-8" style={{ maxWidth: '100%' }}>
              <source src={message.shared_content.audio_url} type="audio/webm" />
            </audio>
          </div>
          {renderReactions()}
        </div>
        {renderTimestamp()}
      </div>
    );
  }

  // Story reply
  if (message.message_type === 'story_reply' && (message.story_id || message.shared_content)) {
    return (
      <div className={`max-w-[85%] ${isOwn ? 'ml-auto' : ''}`} {...messageInteractionProps}>
        {!isOwn && (
          <p className="text-xs text-muted-foreground mb-2 px-1">
            {t('repliedToYourStory', { ns: 'messages' })}
          </p>
        )}
        {message.shared_content && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden p-3 mb-2 relative">
            <StoryMessageCard storyData={message.shared_content} />
            {renderReactions()}
          </div>
        )}
        {message.content && (
          <div className={`rounded-2xl px-4 py-3 mb-2 relative ${isOwn ? 'bg-primary text-primary-foreground ml-auto max-w-fit' : 'bg-card text-card-foreground border border-border'}`}>
            <p className="text-sm">{message.content}</p>
            {renderReactions()}
          </div>
        )}
        {renderTimestamp()}
      </div>
    );
  }

  // Story share
  if (message.message_type === 'story_share' && message.shared_content) {
    return (
      <div className={`max-w-[85%] ${isOwn ? 'ml-auto' : ''}`} {...messageInteractionProps}>
        <div className="bg-card rounded-2xl border border-border overflow-hidden p-3 relative">
          <StoryMessageCard storyData={message.shared_content} content={message.content} />
          {renderReactions()}
        </div>
        {renderTimestamp()}
      </div>
    );
  }

  // Shared content (place, post, profile, folder, trip)
  if (['place_share', 'post_share', 'profile_share', 'folder_share', 'trip_share'].includes(message.message_type) && message.shared_content) {
    return (
      <div className={`w-full max-w-[200px] ${isOwn ? 'ml-auto' : ''}`} {...messageInteractionProps}>
        {message.content && (
          <div className={`rounded-2xl px-4 py-3 mb-2 relative ${isOwn ? 'bg-primary text-primary-foreground ml-auto max-w-fit' : 'bg-card text-card-foreground border border-border'}`}>
            <p className="text-sm">{message.content}</p>
          </div>
        )}
        <div className="bg-card rounded-2xl border border-border relative overflow-visible">
          {message.message_type === 'place_share' && (
            <PlaceMessageCard
              placeData={message.shared_content}
              onViewPlace={(placeData) => {
                const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
                if (onViewPlace) {
                  onViewPlace(placeData, otherUserId);
                } else {
                  navigate('/', {
                    state: {
                      showLocationCard: true,
                      locationData: {
                        id: placeData.id || placeData.place_id || placeData.google_place_id || '',
                        google_place_id: placeData.google_place_id || placeData.place_id || '',
                        name: placeData.name || '',
                        category: placeData.category || 'place',
                        address: placeData.address || '',
                        city: placeData.city || '',
                        coordinates: placeData.coordinates || { lat: 0, lng: 0 }
                      },
                      fromMessages: true,
                      returnToUserId: otherUserId
                    }
                  });
                }
              }}
            />
          )}
          {message.message_type === 'post_share' && <PostMessageCard postData={message.shared_content} />}
          {message.message_type === 'profile_share' && <ProfileMessageCard profileData={message.shared_content} currentChatUserId={otherParticipantId} />}
          {message.message_type === 'folder_share' && <FolderMessageCard folderData={message.shared_content} />}
          {message.message_type === 'trip_share' && <TripMessageCard tripData={message.shared_content} />}
          {renderReactions()}
        </div>
        {renderTimestamp()}
      </div>
    );
  }

  // Default text message
  return (
    <div className="w-full" {...messageInteractionProps}>
      <div 
        className={`rounded-2xl px-4 py-3 relative inline-block max-w-full ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`}
        style={{ wordBreak: 'normal', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}
      >
        <p className="text-sm whitespace-normal break-words">{message.content}</p>
        {renderReactions()}
      </div>
      {renderTimestamp()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if this message's data changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.reactions?.length === nextProps.reactions?.length &&
    prevProps.isOwn === nextProps.isOwn
  );
});

MessageBubble.displayName = 'MessageBubble';

const VirtualizedMessageList = ({
  messages,
  loading,
  userId,
  hiddenMessageIds,
  messageReactions,
  otherUserProfile,
  otherParticipantId,
  formatMessageTime,
  onLongPressStart,
  onLongPressEnd,
  onDoubleTap,
  onToggleReaction,
  onViewPlace,
}: VirtualizedMessageListProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Filter out hidden messages
  const visibleMessages = useMemo(
    () => messages.filter(m => !hiddenMessageIds.includes(m.id)),
    [messages, hiddenMessageIds]
  );

  const virtualizer = useVirtualizer({
    count: visibleMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height - will be measured dynamically
    overscan: 10,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (visibleMessages.length > 0 && parentRef.current) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
      });
    }
  }, [visibleMessages.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="h-full overflow-auto scrollbar-hide p-4"
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
          const message = visibleMessages[virtualRow.index];
          const isOwn = message.sender_id === userId;
          const reactions = messageReactions[message.id] || [];

          return (
            <div
              key={message.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'} py-1`}>
                <div className={`flex items-end gap-2 w-full ${isOwn ? 'flex-row-reverse justify-start' : 'flex-row'}`}>
                  {/* Avatar - only for received messages */}
                  {!isOwn && (
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={otherUserProfile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {otherUserProfile?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-shrink-0 max-w-[calc(100%-40px)]">
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      userId={userId}
                      otherUserProfile={otherUserProfile}
                      otherParticipantId={otherParticipantId}
                      reactions={reactions}
                      formatTime={formatMessageTime}
                      onLongPressStart={() => onLongPressStart(message.id)}
                      onLongPressEnd={onLongPressEnd}
                      onDoubleTap={() => onDoubleTap(message.id)}
                      onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
                      onViewPlace={onViewPlace}
                      t={t}
                      navigate={navigate}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(VirtualizedMessageList);
