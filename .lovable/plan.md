
# Piano: UI Opzioni Messaggio Stile Instagram

## Panoramica

Trasformare l'attuale bottom sheet delle opzioni messaggio in un'esperienza simile a Instagram:

1. **Sfondo sfumato/blur** con il messaggio selezionato evidenziato
2. **Barra emoji** fluttuante sopra il messaggio (cuore, risata, sorpreso, triste, arrabbiato, pollice, +)
3. **Menu azioni** arrotondato sotto il messaggio con opzioni: Rispondi, Elimina

---

## Analisi dell'immagine Instagram

L'UI di Instagram mostra:
- Sfondo con blur/overlay scuro
- Messaggio "evidenziato" (non nascosto)
- Barra emoji in alto con bordi arrotondati bianchi contenente: heart, laugh, surprised, crying, angry, thumbs_up, plus
- Testo "Tocca e tieni premuto per aggiungere una super reazione"
- Menu azioni sotto il messaggio con bordi molto arrotondati, sfondo chiaro/rosa con:
  - Rispondi (freccia)
  - Aggiungi adesivo (sticker icon)
  - Inoltra (send icon)
  - Elimina per te (trash)
  - Segnala (warning - rosso)
  - Altro (dots)

---

## Soluzione Proposta

### Nuova Architettura

Invece di un `Sheet` bottom, creare un **overlay full-screen** che:

1. Mostra uno sfondo scuro semi-trasparente con blur
2. Posiziona il messaggio selezionato al centro (o nella sua posizione originale)
3. Mostra la barra emoji sopra il messaggio
4. Mostra il menu azioni sotto il messaggio

### Componente: MessageOptionsOverlay

Creare un nuovo componente che gestisce l'intera esperienza:

```tsx
interface MessageOptionsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  message: DirectMessage | null;
  isOwnMessage: boolean;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
}
```

### Layout Overlay

```text
+------------------------------------------+
|         SFONDO BLUR/SCURO                |
|                                          |
|   +----------------------------------+   |
|   | Emoji Bar (rounded pill)          |   |
|   | [❤️] [😂] [😮] [😢] [😡] [👍] [+] |   |
|   +----------------------------------+   |
|                                          |
|      +------------------------+          |
|      |   MESSAGGIO BUBBLE     |          |
|      |   "Testo messaggio"    |          |
|      +------------------------+          |
|                                          |
|   +----------------------------------+   |
|   |  Menu Azioni (rounded card)      |   |
|   |                                  |   |
|   |  ← Rispondi                      |   |
|   |  🗑 Elimina                       |   |
|   +----------------------------------+   |
|                                          |
+------------------------------------------+
```

### Stili Chiave

**Sfondo Overlay:**
```tsx
className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center"
```

**Barra Emoji:**
```tsx
className="bg-card/95 backdrop-blur-sm rounded-full px-4 py-3 flex items-center gap-3 shadow-lg border border-border/50"
```

**Singolo Emoji:**
```tsx
className="text-3xl hover:scale-125 active:scale-95 transition-transform cursor-pointer"
```

**Messaggio Evidenziato:**
- Stesso stile del bubble originale ma con shadow piu pronunciato
- `shadow-xl ring-2 ring-primary/20`

**Menu Azioni:**
```tsx
className="bg-card/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border border-border/30 min-w-[200px]"
```

**Singola Azione:**
```tsx
className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50 transition-colors"
```

---

## Modifiche ai File

### 1. Creare nuovo componente: `src/components/messages/MessageOptionsOverlay.tsx`

Componente dedicato che renderizza:
- Overlay full-screen con blur
- Barra emoji con 6 emoji + bottone "+"
- Il messaggio selezionato (ricostruito dal contenuto)
- Menu azioni con Rispondi e Elimina

### 2. Modificare: `src/pages/MessagesPage.tsx`

- Rimuovere il `Sheet` delle opzioni messaggio (linee 1067-1100)
- Rimuovere il `Sheet` dell'emoji picker (linee 1102-1123)
- Aggiungere il nuovo `MessageOptionsOverlay`
- Passare il messaggio selezionato al nuovo componente
- Aggiungere stato per gestire "reply" (opzionale per ora)

---

## Dettaglio Implementazione

### MessageOptionsOverlay.tsx

```tsx
import { useTranslation } from 'react-i18next';
import { X, Reply, Trash2, Plus } from 'lucide-react';
import { DirectMessage } from '@/services/messageService';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const MessageOptionsOverlay = ({
  isOpen,
  onClose,
  message,
  isOwnMessage,
  onReaction,
  onReply,
  onDelete,
  onShowAllEmojis
}: Props) => {
  if (!isOpen || !message) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6"
      onClick={onClose}
    >
      {/* Emoji Bar */}
      <div 
        className="bg-card/95 backdrop-blur-sm rounded-full px-5 py-3 flex items-center gap-4 shadow-xl border border-border/40 mb-4"
        onClick={e => e.stopPropagation()}
      >
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onReaction(emoji)}
            className="text-3xl hover:scale-125 active:scale-90 transition-transform"
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={onShowAllEmojis}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Message Preview */}
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xl mb-4 ${
          isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card text-card-foreground border border-border'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm">{message.content}</p>
      </div>

      {/* Actions Menu */}
      <div 
        className="bg-card/95 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-border/40 min-w-[220px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Reply option - for future */}
        {/* <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50">
          <Reply className="w-5 h-5" />
          <span>{t('reply', { ns: 'messages' })}</span>
        </button> */}
        
        <button 
          onClick={onDelete}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/10 text-destructive"
        >
          <Trash2 className="w-5 h-5" />
          <span className="font-medium">{t('deleteMessage', { ns: 'messages' })}</span>
        </button>
      </div>
    </div>
  );
};
```

### Modifiche a MessagesPage.tsx

1. **Import nuovo componente**
2. **Aggiungere stato per messaggio completo selezionato:**
```tsx
const selectedMessage = useMemo(() => {
  if (!selectedMessageId) return null;
  return messages.find(m => m.id === selectedMessageId) || null;
}, [selectedMessageId, messages]);
```

3. **Sostituire Sheet con MessageOptionsOverlay:**
```tsx
<MessageOptionsOverlay
  isOpen={!!selectedMessageId}
  onClose={() => setSelectedMessageId(null)}
  message={selectedMessage}
  isOwnMessage={selectedMessage?.sender_id === user?.id}
  onReaction={(emoji) => {
    toggleReaction(selectedMessageId!, emoji);
    setSelectedMessageId(null);
  }}
  onDelete={handleDeleteMessage}
  onShowAllEmojis={() => setShowEmojiPicker(true)}
/>
```

---

## Risultato Atteso

1. **UX moderna stile Instagram**: Long press su messaggio apre overlay full-screen
2. **Emoji rapide**: 6 emoji piu usate + bottone "+" per tutti gli emoji
3. **Messaggio evidenziato**: Il messaggio e visibile al centro con sfondo blur
4. **Menu elegante**: Azioni in card arrotondata sotto il messaggio
5. **Chiusura facile**: Tap fuori dall'area chiude l'overlay

---

## File da Creare/Modificare

| File | Azione |
|------|--------|
| `src/components/messages/MessageOptionsOverlay.tsx` | **NUOVO** - Componente overlay |
| `src/pages/MessagesPage.tsx` | **MODIFICA** - Integrare nuovo componente, rimuovere vecchi Sheet |

---

## Traduzioni Necessarie

Le traduzioni esistono gia:
- `messageOptions` - "Opzioni Messaggio"
- `addReaction` - "Aggiungi Reazione"
- `deleteMessage` - "Elimina Messaggio"
- `selectEmoji` - "Seleziona Emoji"

Se si vuole aggiungere "Rispondi" in futuro:
- `reply` - da aggiungere
