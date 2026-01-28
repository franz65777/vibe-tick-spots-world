import { useTranslation } from 'react-i18next';
import { Trash2, Reply } from 'lucide-react';
import { DirectMessage } from '@/services/messageService';
import PlaceMessageCard from './PlaceMessageCard';
import PostMessageCard from './PostMessageCard';
import ProfileMessageCard from './ProfileMessageCard';
import FolderMessageCard from './FolderMessageCard';
import StoryMessageCard from './StoryMessageCard';

const QUICK_EMOJIS = ['❤️', '😋', '🤤', '😍', '🪩', '🎉', '📍', '🥇'];

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
}: MessageOptionsOverlayProps) => {
  const { t } = useTranslation();

  if (!isOpen || !message) return null;

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

  // Render full card for shared content, or text bubble for regular messages
  const renderMessageOrCard = () => {
    const sharedContent = message.shared_content as any;

    // Place share - show full PlaceMessageCard
    if (message.message_type === 'place_share' && sharedContent) {
      return (
        <div onClick={e => e.stopPropagation()}>
          <PlaceMessageCard 
            placeData={sharedContent} 
            onViewPlace={() => {}} // No navigation in overlay
            overlayMode={true}
          />
        </div>
      );
    }

    // Post share - show full PostMessageCard
    if (message.message_type === 'post_share' && sharedContent) {
      return (
        <div onClick={e => e.stopPropagation()}>
          <PostMessageCard postData={sharedContent} />
        </div>
      );
    }

    // Profile share - show full ProfileMessageCard
    if (message.message_type === 'profile_share' && sharedContent) {
      return (
        <div onClick={e => e.stopPropagation()}>
          <ProfileMessageCard profileData={sharedContent} />
        </div>
      );
    }

    // Folder share - show full FolderMessageCard
    if (message.message_type === 'folder_share' && sharedContent) {
      return (
        <div onClick={e => e.stopPropagation()}>
          <FolderMessageCard folderData={sharedContent} />
        </div>
      );
    }

    // Story share/reply - show full StoryMessageCard
    if ((message.message_type === 'story_share' || message.message_type === 'story_reply') && sharedContent) {
      return (
        <div onClick={e => e.stopPropagation()}>
          <StoryMessageCard storyData={sharedContent} content={message.content} />
        </div>
      );
    }

    // Default: regular text message bubble
    return (
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xl ring-2 ring-white/10 ${
          isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card text-card-foreground border border-border/50'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col p-6 animate-fade-in"
      onClick={onClose}
    >
      {/* === 1. EMOJI BAR - FIXED AT TOP === */}
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} pt-safe mt-4`}>
        <div 
          className="bg-card/90 backdrop-blur-lg rounded-full px-4 py-2.5 flex items-center gap-2 shadow-xl border border-border/30"
          onClick={e => e.stopPropagation()}
        >
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-xl sm:text-2xl hover:scale-125 active:scale-90 transition-transform duration-150"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* === 2. MESSAGE/CARD + 3. ACTIONS BELOW === */}
      <div className={`flex-1 flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} justify-start gap-4 px-2 mt-6`}>
        {/* Message/Card */}
        <div onClick={e => e.stopPropagation()}>
          {renderMessageOrCard()}
        </div>

        {/* Actions Menu - Directly below message */}
        <div 
          className="bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-border/20 min-w-[200px]"
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
  );
};

export default MessageOptionsOverlay;
