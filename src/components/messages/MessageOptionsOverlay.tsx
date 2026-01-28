import { useTranslation } from 'react-i18next';
import { Trash2, Plus, Reply } from 'lucide-react';
import { DirectMessage } from '@/services/messageService';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

interface MessageOptionsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  message: DirectMessage | null;
  isOwnMessage: boolean;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
  onShowAllEmojis: () => void;
}

const MessageOptionsOverlay = ({
  isOpen,
  onClose,
  message,
  isOwnMessage,
  onReaction,
  onReply,
  onDelete,
  onShowAllEmojis
}: MessageOptionsOverlayProps) => {
  const { t } = useTranslation();

  if (!message) return null;

  const handleReaction = (emoji: string) => {
    onReaction(emoji);
    onClose();
  };

  const handleReply = () => {
    onReply();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  // Render message content based on type
  const renderMessageContent = () => {
    if (!message.content && message.shared_content) {
      // For shared content without text, show a preview
      const sharedContent = message.shared_content as any;
      if (message.message_type === 'place_share') {
        return sharedContent.name || sharedContent.place_name || t('placeShared', { ns: 'messages', defaultValue: 'Place shared' });
      }
      if (message.message_type === 'post_share') {
        return sharedContent.caption || t('postShared', { ns: 'messages', defaultValue: 'Post shared' });
      }
      if (message.message_type === 'profile_share') {
        return `@${sharedContent.username || t('profileShared', { ns: 'messages', defaultValue: 'Profile shared' })}`;
      }
      if (message.message_type === 'folder_share') {
        return sharedContent.name || t('folderShared', { ns: 'messages', defaultValue: 'Folder shared' });
      }
      if (message.message_type === 'story_share' || message.message_type === 'story_reply') {
        return t('storyShared', { ns: 'messages', defaultValue: 'Story' });
      }
    }
    return message.content;
  };

  return (
    <>
      {/* Full-screen overlay with blur */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col p-6 animate-fade-in"
          onClick={onClose}
        >
          {/* Message at TOP - positioned left (received) or right (sent) */}
          <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} pt-safe mt-4`}>
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xl ring-2 ring-white/10 ${
                isOwnMessage 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card text-card-foreground border border-border/50'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm leading-relaxed">
                {renderMessageContent()}
              </p>
            </div>
          </div>

          {/* Content area - aligned with message position */}
          <div className={`flex-1 flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} justify-center gap-5 px-2`}>
            {/* Emoji Bar */}
            <div 
              className="bg-card/90 backdrop-blur-lg rounded-full px-5 py-3 flex items-center gap-3 shadow-xl border border-border/30"
              onClick={e => e.stopPropagation()}
            >
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl sm:text-3xl hover:scale-125 active:scale-90 transition-transform duration-150"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => {
                  onShowAllEmojis();
                }}
                className="w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors ml-1"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Actions Menu with blur */}
            <div 
              className="bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-border/20 min-w-[220px]"
              onClick={e => e.stopPropagation()}
            >
              {/* Reply Button */}
              <button 
                onClick={handleReply}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50 active:bg-accent/70 transition-colors"
              >
                <Reply className="w-5 h-5 text-foreground" />
                <span className="font-medium text-foreground">{t('rispondi', { ns: 'messages', defaultValue: 'Rispondi' })}</span>
              </button>
              
              <div className="h-px bg-border/30 mx-3" />
              
              {/* Delete Button */}
              <button 
                onClick={handleDelete}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/10 active:bg-destructive/20 transition-colors text-destructive"
              >
                <Trash2 className="w-5 h-5" />
                <span className="font-medium">{t('deleteMessage', { ns: 'messages' })}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageOptionsOverlay;
