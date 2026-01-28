import { useTranslation } from 'react-i18next';
import { Trash2, Plus } from 'lucide-react';
import { DirectMessage } from '@/services/messageService';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

interface MessageOptionsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  message: DirectMessage | null;
  isOwnMessage: boolean;
  onReaction: (emoji: string) => void;
  onDelete: () => void;
  onShowAllEmojis: () => void;
}

const MessageOptionsOverlay = ({
  isOpen,
  onClose,
  message,
  isOwnMessage,
  onReaction,
  onDelete,
  onShowAllEmojis
}: MessageOptionsOverlayProps) => {
  const { t } = useTranslation();

  if (!message) return null;

  const handleReaction = (emoji: string) => {
    onReaction(emoji);
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <>
      {/* Full-screen overlay with blur */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={onClose}
        >
          {/* Emoji Bar */}
          <div 
            className="bg-card/95 backdrop-blur-sm rounded-full px-5 py-3 flex items-center gap-3 shadow-xl border border-border/40 mb-5"
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

          {/* Message Preview */}
          <div 
            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-2xl mb-5 ring-2 ring-white/10 ${
              isOwnMessage 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card text-card-foreground border border-border/50'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm leading-relaxed">{message.content || t('sharedContent', { ns: 'messages', defaultValue: 'Shared content' })}</p>
          </div>

          {/* Actions Menu */}
          <div 
            className="bg-card/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-border/30 min-w-[200px]"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={handleDelete}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/10 active:bg-destructive/20 transition-colors text-destructive"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">{t('deleteMessage', { ns: 'messages' })}</span>
            </button>
          </div>
        </div>
      )}

      {/* Extended Emoji Picker Sheet - stays as a Sheet for more emojis */}
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="rounded-t-[20px]">
          <SheetHeader>
            <SheetTitle className="text-center">{t('selectEmoji', { ns: 'messages' })}</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MessageOptionsOverlay;
