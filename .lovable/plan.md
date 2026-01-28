

## Obiettivo

Correggere due problemi critici nella visualizzazione delle risposte ai messaggi:
1. **Messaggio di risposta allineato a sinistra invece che a destra** - deve essere allineato a destra perché è un messaggio inviato dall'utente corrente
2. **Mostra "Contenuto condiviso" invece della card del contenuto** - quando si risponde a un luogo/post/profilo, deve mostrare la card completa (PlaceMessageCard, PostMessageCard, etc.)

---

## Analisi Root-Cause

### Problema 1: Allineamento sbagliato
Nel file `VirtualizedMessageList.tsx`, il componente `MessageBubble` per i messaggi di testo con risposta (linee 247-260) usa:
```tsx
<div className="w-full" {...messageInteractionProps}>
  {renderReplyContext()}
  <div className={`... ${isOwn ? 'bg-primary' : 'bg-card'}`}>
```

Il wrapper esterno ha `className="w-full"` senza `isOwn ? 'ml-auto' : ''`, quindi non viene allineato a destra.

### Problema 2: Manca la card del contenuto
Il `messageService.ts` quando salva la risposta (linee 175-180) memorizza solo:
```typescript
{
  reply_to_id: replyToMessage.id,
  reply_to_content: replyToMessage.content || '',  // vuoto per place_share!
  reply_to_sender_id: replyToMessage.sender_id,
  reply_to_message_type: replyToMessage.message_type,
}
```

**NON** salva `replyToMessage.shared_content` che contiene i dati del luogo/post/profilo.

Quindi nel `renderReplyContext()` (linee 238-240) mostra:
```tsx
<p>{replyContext.reply_to_content || t('sharedContent')}</p>
```

Siccome `reply_to_content` è vuoto, mostra "Contenuto condiviso".

---

## Piano di Implementazione

### Fase 1: Salvare shared_content del messaggio originale

**File:** `src/services/messageService.ts` (righe 175-180)

Modificare per includere `reply_to_shared_content`:

```typescript
const sharedContent = replyToMessage ? {
  reply_to_id: replyToMessage.id,
  reply_to_content: replyToMessage.content || '',
  reply_to_sender_id: replyToMessage.sender_id,
  reply_to_message_type: replyToMessage.message_type,
  reply_to_shared_content: replyToMessage.shared_content || null,  // AGGIUNTO
} : null;
```

### Fase 2: Aggiornare interfaccia replyContext

**File:** `src/components/messages/VirtualizedMessageList.tsx` (righe 70-76)

Aggiungere `reply_to_shared_content` al tipo:

```typescript
const replyContext = message.shared_content as {
  reply_to_id?: string;
  reply_to_content?: string;
  reply_to_sender_id?: string;
  reply_to_message_type?: string;
  reply_to_shared_content?: any;  // AGGIUNTO
} | null;
```

### Fase 3: Correggere allineamento + mostrare card

**File:** `src/components/messages/VirtualizedMessageList.tsx`

Modificare la funzione `renderReplyContext()` (righe 226-244) per:
1. Mostrare la card completa se `reply_to_message_type` è place_share/post_share/etc
2. Aggiungere allineamento corretto

Nuovo codice per `renderReplyContext()`:

```tsx
const renderReplyContext = () => {
  if (!isReply || !replyContext) return null;
  
  const sharedContent = replyContext.reply_to_shared_content;
  const messageType = replyContext.reply_to_message_type;
  
  // Render appropriate card based on message type
  const renderSharedCard = () => {
    if (!sharedContent) {
      return (
        <div className="bg-muted/40 rounded-xl px-3 py-2 text-sm opacity-60 border-l-2 border-muted-foreground/30">
          <p className="line-clamp-2 text-muted-foreground">
            {replyContext.reply_to_content || t('sharedContent', { ns: 'messages' })}
          </p>
        </div>
      );
    }
    
    switch (messageType) {
      case 'place_share':
        return (
          <div className="opacity-70 scale-90 origin-top-left">
            <PlaceMessageCard 
              placeData={sharedContent} 
              onViewPlace={() => {}} 
            />
          </div>
        );
      case 'post_share':
        return (
          <div className="opacity-70 scale-90 origin-top-left">
            <PostMessageCard postData={sharedContent} />
          </div>
        );
      case 'profile_share':
        return (
          <div className="opacity-70 scale-90 origin-top-left">
            <ProfileMessageCard 
              profileData={sharedContent} 
              currentChatUserId={otherParticipantId}
            />
          </div>
        );
      case 'story_share':
      case 'story_reply':
        return (
          <div className="opacity-70 scale-90 origin-top-left">
            <StoryMessageCard storyData={sharedContent} />
          </div>
        );
      case 'folder_share':
        return (
          <div className="opacity-70 scale-90 origin-top-left">
            <FolderMessageCard folderData={sharedContent} />
          </div>
        );
      case 'trip_share':
        return (
          <div className="opacity-70 scale-90 origin-top-left">
            <TripMessageCard tripData={sharedContent} />
          </div>
        );
      default:
        return (
          <div className="bg-muted/40 rounded-xl px-3 py-2 text-sm opacity-60 border-l-2 border-muted-foreground/30">
            <p className="line-clamp-2 text-muted-foreground">
              {replyContext.reply_to_content || t('sharedContent', { ns: 'messages' })}
            </p>
          </div>
        );
    }
  };
  
  return (
    <div className="mb-2">
      <p className="text-xs text-muted-foreground mb-1">
        {isOwn 
          ? t('youReplied', { ns: 'messages' }) 
          : t('theyReplied', { ns: 'messages', name: otherUserProfile?.username || 'User' })}
      </p>
      {renderSharedCard()}
    </div>
  );
};
```

### Fase 4: Correggere wrapper per allineamento

**File:** `src/components/messages/VirtualizedMessageList.tsx`

Modificare il wrapper del default text message (riga 249) da:
```tsx
<div className="w-full" {...messageInteractionProps}>
```
a:
```tsx
<div className={`w-full ${isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}`} {...messageInteractionProps}>
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/services/messageService.ts` | Aggiungere `reply_to_shared_content` nel contesto di risposta |
| `src/components/messages/VirtualizedMessageList.tsx` | Aggiornare interfaccia + renderReplyContext con card + fix allineamento |

---

## Risultato Atteso

**Prima:**
- Messaggio di risposta allineato a sinistra
- Mostra "Contenuto condiviso" come testo

**Dopo:**
- Messaggio di risposta allineato a destra (come messaggio inviato)
- Mostra la card completa (PlaceMessageCard, PostMessageCard, etc.) con opacità 70% e scala 90%
- Etichetta "Hai risposto" sopra la card

---

## Note Tecniche

1. Le card vengono renderizzate con `opacity-70 scale-90` per distinguerle dal messaggio originale e mantenere una gerarchia visiva
2. `origin-top-left` assicura che la scala avvenga dall'angolo corretto in base all'allineamento
3. La logica è retrocompatibile: i messaggi esistenti senza `reply_to_shared_content` mostreranno il fallback testuale

