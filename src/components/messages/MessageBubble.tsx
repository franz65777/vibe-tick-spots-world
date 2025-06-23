
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import PlaceMessageCard from './PlaceMessageCard';
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
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwnMessage && (
        <Avatar className="w-8 h-8 mt-auto">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
            {(message.sender?.full_name || message.sender?.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {message.message_type === 'place_share' && message.shared_content ? (
          <div className={`${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-100'} rounded-2xl p-3`}>
            {message.content && (
              <p className={`text-sm mb-3 ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                {message.content}
              </p>
            )}
            <PlaceMessageCard
              placeData={message.shared_content}
              onViewPlace={handleViewPlace}
            />
          </div>
        ) : (
          <div className={`${
            isOwnMessage 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          } rounded-2xl px-4 py-2 max-w-full break-words`}>
            <p className="text-sm">{message.content}</p>
          </div>
        )}
        
        <span className="text-xs text-gray-500 mt-1 px-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
