

# Piano: UI Opzioni Messaggio Instagram-Style + Swipe-to-Reply

## Panoramica

Implementare un'esperienza di messaggistica moderna con:

1. **MessageOptionsOverlay migliorato**: Messaggio posizionato in alto a sinistra (ricevuti) o destra (inviati)
2. **Menu azioni con blur**: Sfondo blur per il menu elimina/rispondi
3. **Bottone Rispondi**: Aggiungere azione "Rispondi" nel menu
4. **Swipe-to-Reply**: Gesture iOS-style per rispondere ai messaggi (slide destro per ricevuti, slide sinistro per inviati)

---

## Componente 1: MessageOptionsOverlay Migliorato

### Layout Aggiornato

```text
+------------------------------------------+
|         SFONDO BLUR/SCURO                |
|                                          |
|  +------------------------+  <-- TOP-LEFT (ricevuti)    
|  |   MESSAGGIO BUBBLE     |              |
|  |   "Testo messaggio"    |              |
|  +------------------------+              |
|                                          |
|   +----------------------------------+   |
|   | Emoji Bar (centered below msg)   |   |
|   | [❤️] [😂] [😮] [😢] [😡] [👍] [+] |   |
|   +----------------------------------+   |
|                                          |
|   +----------------------------------+   |
|   |  Menu Azioni (blurred card)      |   |
|   |  ↩️ Rispondi                      |   |
|   |  🗑 Elimina                       |   |
|   +----------------------------------+   |
|                                          |
+------------------------------------------+
```

Per messaggi inviati, il bubble sara in alto a destra.

### Modifiche al Componente

**Nuovo layout con posizionamento dinamico:**

```tsx
// Wrapper per posizionamento dinamico
<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md p-6 flex flex-col">
  {/* Message at top - positioned based on sender */}
  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} pt-safe mt-4`}>
    <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xl ${
      isOwnMessage 
        ? 'bg-primary text-primary-foreground' 
        : 'bg-card text-card-foreground border border-border/50'
    }`}>
      <p className="text-sm">{message.content}</p>
    </div>
  </div>
  
  {/* Emoji bar - centered */}
  <div className="flex justify-center mt-6">
    <div className="bg-card/90 backdrop-blur-lg rounded-full px-5 py-3 shadow-xl">
      {/* emoji buttons */}
    </div>
  </div>
  
  {/* Actions menu - centered with blur */}
  <div className="flex justify-center mt-4">
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-border/20 min-w-[200px]">
      {/* Reply button */}
      <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50">
        <Reply className="w-5 h-5" />
        <span>Rispondi</span>
      </button>
      
      {/* Divider */}
      <div className="h-px bg-border/30" />
      
      {/* Delete button with stronger blur */}
      <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/10 text-destructive backdrop-blur-lg">
        <Trash2 className="w-5 h-5" />
        <span>Elimina</span>
      </button>
    </div>
  </div>
</div>
```

---

## Componente 2: Swipe-to-Reply per Messaggi

### Nuovo Hook: useMessageSwipe

Creare un hook dedicato per il gesture swipe-to-reply:

```tsx
// src/hooks/useMessageSwipe.ts
interface UseMessageSwipeOptions {
  isOwnMessage: boolean;
  threshold?: number;
  onReply: () => void;
}

export const useMessageSwipe = ({
  isOwnMessage,
  threshold = 60,
  onReply
}: UseMessageSwipeOptions) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  // For received messages: swipe RIGHT triggers reply
  // For sent messages: swipe LEFT triggers reply
  const swipeDirection = isOwnMessage ? 'left' : 'right';
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsActive(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    
    if (swipeDirection === 'right' && deltaX > 0) {
      setSwipeOffset(Math.min(deltaX, threshold * 1.5));
    } else if (swipeDirection === 'left' && deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -threshold * 1.5));
    }
  };
  
  const handleTouchEnd = () => {
    const absOffset = Math.abs(swipeOffset);
    if (absOffset >= threshold) {
      onReply();
      // Haptic feedback
      triggerHaptic('medium');
    }
    setSwipeOffset(0);
    setIsActive(false);
  };
  
  return {
    swipeOffset,
    isActive,
    showReplyIndicator: Math.abs(swipeOffset) >= threshold * 0.5,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
};
```

### Integrazione in VirtualizedMessageList

Wrapper per ogni messaggio con swipe:

```tsx
// Dentro VirtualizedMessageList.tsx
const SwipeableMessageRow = ({
  message,
  isOwn,
  onReply,
  children
}: {
  message: DirectMessage;
  isOwn: boolean;
  onReply: (messageId: string) => void;
  children: React.ReactNode;
}) => {
  const {
    swipeOffset,
    showReplyIndicator,
    handlers
  } = useMessageSwipe({
    isOwnMessage: isOwn,
    threshold: 60,
    onReply: () => onReply(message.id)
  });
  
  return (
    <div className="relative overflow-hidden" {...handlers}>
      {/* Reply indicator icon */}
      <div 
        className={`absolute top-1/2 -translate-y-1/2 transition-opacity ${
          isOwn ? 'right-2' : 'left-2'
        } ${showReplyIndicator ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Reply className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      {/* Message content with transform */}
      <div 
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

---

## Componente 3: Reply State Management

### Stato per la Reply in MessagesPage

```tsx
// In MessagesPage.tsx
const [replyingToMessage, setReplyingToMessage] = useState<DirectMessage | null>(null);

// Handler per reply
const handleReply = useCallback((message: DirectMessage) => {
  setReplyingToMessage(message);
  // Focus input
  inputRef.current?.focus();
}, []);

// UI Preview della reply sopra l'input
{replyingToMessage && (
  <div className="border-t border-border bg-accent/30 px-4 py-2 flex items-center justify-between">
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">
        {replyingToMessage.sender_id === user?.id 
          ? t('replyingToYourself') 
          : t('replyingTo', { name: otherUserProfile?.username })}
      </p>
      <p className="text-sm text-foreground truncate">{replyingToMessage.content}</p>
    </div>
    <button onClick={() => setReplyingToMessage(null)}>
      <X className="w-5 h-5 text-muted-foreground" />
    </button>
  </div>
)}
```

---

## Animazioni iOS-Style

### Transizioni Smooth

```css
/* Per lo swipe */
.message-swipe-container {
  transition: transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

/* Per il reply indicator */
.reply-indicator {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

/* Elastic bounce quando si raggiunge la soglia */
@keyframes reply-bounce {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
```

---

## File da Creare/Modificare

| File | Azione | Descrizione |
|------|--------|-------------|
| `src/hooks/useMessageSwipe.ts` | **NUOVO** | Hook per gesture swipe-to-reply |
| `src/components/messages/MessageOptionsOverlay.tsx` | **MODIFICA** | Nuovo layout con posizione messaggio in alto + Reply button |
| `src/components/messages/VirtualizedMessageList.tsx` | **MODIFICA** | Integrare SwipeableMessageRow wrapper |
| `src/pages/MessagesPage.tsx` | **MODIFICA** | Aggiungere stato `replyingToMessage` + Reply UI |

---

## Traduzioni da Aggiungere

```json
{
  "messages": {
    "reply": "Rispondi",
    "replyingTo": "Rispondendo a {{name}}",
    "replyingToYourself": "Rispondendo a te stesso"
  }
}
```

---

## Dettaglio Tecnico: MessageOptionsOverlay Aggiornato

```tsx
const MessageOptionsOverlay = ({
  isOpen,
  onClose,
  message,
  isOwnMessage,
  onReaction,
  onReply,  // NUOVO
  onDelete,
  onShowAllEmojis
}: MessageOptionsOverlayProps) => {
  const { t } = useTranslation();

  if (!isOpen || !message) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col p-6 animate-fade-in"
      onClick={onClose}
    >
      {/* Message at TOP - positioned left or right */}
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} pt-safe mt-2`}>
        <div 
          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xl ring-2 ring-white/10 ${
            isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card text-card-foreground border border-border/50'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {message.message_type === 'place_share' || message.message_type === 'post_share' 
            ? <p className="text-sm">{message.content || t('sharedContent')}</p>
            : <p className="text-sm leading-relaxed">{message.content}</p>
          }
        </div>
      </div>

      {/* Centered content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* Emoji Bar */}
        <div 
          className="bg-card/90 backdrop-blur-lg rounded-full px-5 py-3 flex items-center gap-3 shadow-xl border border-border/30"
          onClick={e => e.stopPropagation()}
        >
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onReaction(emoji); onClose(); }}
              className="text-2xl sm:text-3xl hover:scale-125 active:scale-90 transition-transform duration-150"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={onShowAllEmojis}
            className="w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center"
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
            onClick={() => { onReply(); onClose(); }}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50 transition-colors"
          >
            <Reply className="w-5 h-5 text-foreground" />
            <span className="font-medium text-foreground">{t('reply', { ns: 'messages' })}</span>
          </button>
          
          <div className="h-px bg-border/30 mx-3" />
          
          {/* Delete Button */}
          <button 
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/10 transition-colors text-destructive"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">{t('deleteMessage', { ns: 'messages' })}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Dettaglio Tecnico: useMessageSwipe Hook

```tsx
// src/hooks/useMessageSwipe.ts
import { useState, useRef, useCallback } from 'react';
import { triggerHaptic } from '@/utils/haptics';

interface UseMessageSwipeOptions {
  isOwnMessage: boolean;
  threshold?: number;
  onReply: () => void;
  enabled?: boolean;
}

export const useMessageSwipe = ({
  isOwnMessage,
  threshold = 60,
  onReply,
  enabled = true
}: UseMessageSwipeOptions) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
  }, [enabled]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // Determine swipe direction on first significant move
    if (isHorizontalSwipe.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // Only process horizontal swipes
    if (!isHorizontalSwipe.current) return;
    
    // For received messages: swipe RIGHT
    // For sent messages: swipe LEFT
    if (isOwnMessage) {
      // Sent message - swipe left (negative delta)
      if (deltaX < 0) {
        setSwipeOffset(Math.max(deltaX, -threshold * 1.5));
      }
    } else {
      // Received message - swipe right (positive delta)
      if (deltaX > 0) {
        setSwipeOffset(Math.min(deltaX, threshold * 1.5));
      }
    }
  }, [enabled, isOwnMessage, threshold]);
  
  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    
    const absOffset = Math.abs(swipeOffset);
    if (absOffset >= threshold) {
      onReply();
      triggerHaptic('medium');
    }
    
    setSwipeOffset(0);
    isHorizontalSwipe.current = null;
  }, [enabled, swipeOffset, threshold, onReply]);
  
  return {
    swipeOffset,
    showReplyIndicator: Math.abs(swipeOffset) >= threshold * 0.5,
    progress: Math.min(Math.abs(swipeOffset) / threshold, 1),
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd
    }
  };
};
```

---

## Risultato Atteso

1. **Posizione messaggio**: Messaggi ricevuti in alto a sinistra, inviati in alto a destra
2. **Menu blur elegante**: Card azioni con `backdrop-blur-xl` per effetto vetro
3. **Reply button**: Azione "Rispondi" nel menu opzioni
4. **Swipe gesture**: Slide fluido per rispondere (iOS-style con 60fps)
5. **Reply preview**: Anteprima del messaggio sopra l'input quando si risponde
6. **Haptic feedback**: Vibrazione quando si raggiunge la soglia swipe

