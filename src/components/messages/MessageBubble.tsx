
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import PlaceMessageCard from './PlaceMessageCard';
import PostMessageCard from './PostMessageCard';
import { DirectMessage } from '@/services/messageService';

interface MessageBubbleProps {
  message: DirectMessage;
  isOwnMessage: boolean;
  onViewPlace?: (place: any) => void;
}

const MessageBubble = ({ message, isOwnMessage, onViewPlace }: MessageBubbleProps) => {
  const handleViewPlace = (place: any) => {
    if (onViewPlace) {
      onViewPlace(place);
    }
  };

  return (
    <div className={`flex gap-2.5 mb-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwnMessage && (
        <Avatar className="w-8 h-8 mt-auto flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {(message.sender?.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {message.message_type === 'place_share' && message.shared_content ? (
          <div className="flex flex-col gap-2">
            {message.content && (
              <div className={`${
                isOwnMessage 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground'
              } rounded-2xl px-4 py-2.5 max-w-full break-words`}>
                <p className="text-[13px] leading-relaxed">{message.content}</p>
              </div>
            )}
            <PlaceMessageCard
              placeData={message.shared_content}
              onViewPlace={handleViewPlace}
            />
          </div>
        ) : message.message_type === 'post_share' && message.shared_content ? (
          <div className="flex flex-col gap-2">
            {message.content && (
              <div className={`${
                isOwnMessage 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground'
              } rounded-2xl px-4 py-2.5 max-w-full break-words`}>
                <p className="text-[13px] leading-relaxed">{message.content}</p>
              </div>
            )}
            <PostMessageCard postData={message.shared_content} />
          </div>
        ) : (
          <div className={`${
            isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-foreground'
          } rounded-2xl px-4 py-2.5 max-w-full break-words shadow-sm`}>
            <p className="text-[13px] leading-relaxed">{message.content}</p>
          </div>
        )}
        
        <span className="text-[11px] text-muted-foreground mt-1 px-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
