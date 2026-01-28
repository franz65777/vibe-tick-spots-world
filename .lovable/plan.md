
# Piano: Fix MessageOptionsOverlay Layout + Full Card Display

## Panoramica delle Modifiche

Correggere l'overlay delle opzioni messaggio in base al feedback:

1. **Ordine verticale corretto**: Messaggio → Emoji bar (sopra) → Menu azioni (sotto)
2. **Mostrare la card completa** per shared content (post, luoghi, profili, etc.)
3. **Nuovi emoji**: `❤️ 😋 🤤 😍 🪩 🎉 📍 🥇` (senza bottone "+")
4. **Allineamento dinamico**: Tutto allineato a sinistra (ricevuti) o destra (inviati)

---

## Layout Finale Desiderato

```text
+------------------------------------------+
|         SFONDO BLUR/SCURO                |
|                                          |
|  [Messaggio/Card in alto]                |
|      ↓ allineato left (ricevuti)         |
|      ↓ allineato right (inviati)         |
|                                          |
|  [Emoji Bar - stessi emoji custom]       |
|  ❤️ 😋 🤤 😍 🪩 🎉 📍 🥇                   |
|                                          |
|  [Menu Azioni]                           |
|  ↩️ Rispondi                              |
|  🗑 Elimina                               |
|                                          |
+------------------------------------------+
```

---

## Dettaglio Tecnico

### Modifiche a `MessageOptionsOverlay.tsx`

#### 1. Cambio Emoji Set

```tsx
// PRIMA
const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

// DOPO
const QUICK_EMOJIS = ['❤️', '😋', '🤤', '😍', '🪩', '🎉', '📍', '🥇'];
```

#### 2. Import delle Card Components

```tsx
import PlaceMessageCard from './PlaceMessageCard';
import PostMessageCard from './PostMessageCard';
import ProfileMessageCard from './ProfileMessageCard';
import FolderMessageCard from './FolderMessageCard';
import StoryMessageCard from './StoryMessageCard';
```

#### 3. Nuovo Layout - Ordine Verticale Corretto

Struttura dall'alto verso il basso:
1. **Messaggio/Card** (in alto, allineato left/right)
2. **Emoji Bar** (sotto il messaggio)
3. **Menu Azioni** (sotto gli emoji)

```tsx
<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col p-6">
  {/* === SEZIONE TOP: Messaggio/Card === */}
  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} pt-safe mt-4`}>
    {renderMessageOrCard()}
  </div>

  {/* === SEZIONE CENTRALE: Emoji + Actions (allineati) === */}
  <div className={`flex-1 flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} justify-center gap-4 px-2`}>
    
    {/* Emoji Bar - SOPRA (no plus button) */}
    <div className="bg-card/90 backdrop-blur-lg rounded-full px-4 py-2.5 flex items-center gap-2 shadow-xl">
      {QUICK_EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => handleReaction(emoji)} className="text-xl hover:scale-125">
          {emoji}
        </button>
      ))}
    </div>

    {/* Actions Menu - SOTTO */}
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl min-w-[200px]">
      <button onClick={handleReply}>↩️ Rispondi</button>
      <button onClick={handleDelete}>🗑 Elimina</button>
    </div>
  </div>
</div>
```

#### 4. Render della Card Completa per Shared Content

Invece di mostrare solo testo, renderiamo la card effettiva:

```tsx
const renderMessageOrCard = () => {
  const sharedContent = message.shared_content as any;
  
  // Per shared content, mostra la card completa
  if (message.message_type === 'place_share' && sharedContent) {
    return (
      <div onClick={e => e.stopPropagation()}>
        <PlaceMessageCard 
          placeData={sharedContent} 
          onViewPlace={() => {}} // No navigation in overlay
        />
      </div>
    );
  }
  
  if (message.message_type === 'post_share' && sharedContent) {
    return (
      <div onClick={e => e.stopPropagation()}>
        <PostMessageCard postData={sharedContent} />
      </div>
    );
  }
  
  if (message.message_type === 'profile_share' && sharedContent) {
    return (
      <div onClick={e => e.stopPropagation()}>
        <ProfileMessageCard profileData={sharedContent} />
      </div>
    );
  }
  
  if (message.message_type === 'folder_share' && sharedContent) {
    return (
      <div onClick={e => e.stopPropagation()}>
        <FolderMessageCard folderData={sharedContent} />
      </div>
    );
  }
  
  if ((message.message_type === 'story_share' || message.message_type === 'story_reply') && sharedContent) {
    return (
      <div onClick={e => e.stopPropagation()}>
        <StoryMessageCard storyData={sharedContent} content={message.content} />
      </div>
    );
  }
  
  // Default: messaggio testo normale
  return (
    <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xl ${
      isOwnMessage 
        ? 'bg-primary text-primary-foreground' 
        : 'bg-card text-card-foreground border border-border/50'
    }`}>
      <p className="text-sm">{message.content}</p>
    </div>
  );
};
```

#### 5. Rimuovere il Bottone "+"

Eliminare completamente il bottone `Plus` e il prop `onShowAllEmojis` dall'uso interno (può rimanere nell'interfaccia per retrocompatibilità ma non viene usato).

---

## Risultato Atteso

1. **Layout Instagram-style**: Messaggio in alto → Emoji sotto → Menu sotto ancora
2. **Card complete**: Post, luoghi, profili mostrati come card reali (non solo testo)
3. **Emoji personalizzate**: `❤️ 😋 🤤 😍 🪩 🎉 📍 🥇` senza bottone "+"
4. **Allineamento dinamico**: Tutto allineato a sinistra (ricevuti) o destra (inviati)

---

## File da Modificare

| File | Azione |
|------|--------|
| `src/components/messages/MessageOptionsOverlay.tsx` | **MODIFICA** - Nuovo layout, import card, nuovi emoji |

---

## Riepilogo Modifiche Chiave

1. **Emoji**: Cambiare da `['❤️', '😂', '😮', '😢', '😡', '👍']` a `['❤️', '😋', '🤤', '😍', '🪩', '🎉', '📍', '🥇']`
2. **Plus button**: Rimuovere completamente
3. **Card components**: Importare e usare `PlaceMessageCard`, `PostMessageCard`, `ProfileMessageCard`, etc.
4. **Layout order**: Messaggio TOP → Emoji MIDDLE → Actions BOTTOM (tutti allineati left/right)
