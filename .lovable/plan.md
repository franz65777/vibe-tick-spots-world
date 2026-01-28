

## Obiettivo

Eliminare lo stato di loading quando si invia un messaggio, implementando un'esperienza **optimistic UI** simile a WhatsApp/iMessage dove:
1. Il messaggio appare istantaneamente nella chat
2. Non c'è nessuno spinner/loading durante l'invio
3. Il messaggio viene salvato in background

---

## Analisi Root-Cause

Il problema è in `handleSendMessage` (righe 354-371):

```typescript
const handleSendMessage = useCallback(async () => {
  // ...
  try {
    setSending(true);
    await messageService.sendTextMessage(...);  // Invia al server
    setNewMessage('');
    setReplyingToMessage(null);
    await loadMessages(otherParticipant.id);   // PROBLEMA: ricarica TUTTI i messaggi
    await loadThreads();                        // PROBLEMA: ricarica thread
  } finally {
    setSending(false);
  }
}, [...]);
```

E `loadMessages` (righe 277-307) fa:
```typescript
setLoading(true);  // Questo causa lo spinner!
const data = await messageService.getMessagesInThread(otherUserId);
setMessages(data || []);
setLoading(false);
```

**Risultato:** Ogni volta che si invia un messaggio, tutta la chat scompare e mostra uno spinner mentre ricarica tutti i messaggi.

---

## Soluzione: Optimistic UI

Invece di ricaricare tutti i messaggi, aggiungiamo il nuovo messaggio direttamente all'array locale:

### Fase 1: Implementare Optimistic Add

Modificare `handleSendMessage` per:
1. Creare un messaggio "ottimistico" con ID temporaneo
2. Aggiungerlo subito ai messaggi locali
3. Inviare al server in background
4. Sostituire l'ID temporaneo con quello reale quando il server risponde
5. **NON** ricaricare i messaggi

```typescript
const handleSendMessage = useCallback(async () => {
  if (!newMessage.trim() || !selectedThread || !user) return;
  const otherParticipant = getOtherParticipant(selectedThread);
  if (!otherParticipant) return;
  
  const messageContent = newMessage.trim();
  const replyTo = replyingToMessage;
  
  // 1. Clear input immediately for instant feedback
  setNewMessage('');
  setReplyingToMessage(null);
  
  // 2. Create optimistic message with temporary ID
  const tempId = `temp-${Date.now()}`;
  const optimisticMessage: DirectMessage = {
    id: tempId,
    sender_id: user.id,
    receiver_id: otherParticipant.id,
    content: messageContent,
    message_type: 'text',
    is_read: false,
    created_at: new Date().toISOString(),
    shared_content: replyTo ? {
      reply_to_id: replyTo.id,
      reply_to_content: replyTo.content || '',
      reply_to_sender_id: replyTo.sender_id,
      reply_to_message_type: replyTo.message_type,
      reply_to_shared_content: replyTo.shared_content || null,
    } : null,
    sender: {
      username: user.user_metadata?.username || 'You',
      full_name: user.user_metadata?.full_name || '',
      avatar_url: user.user_metadata?.avatar_url || ''
    }
  };
  
  // 3. Add to UI immediately (optimistic update)
  setMessages(prev => [...prev, optimisticMessage]);
  
  // 4. Scroll to bottom
  setTimeout(() => scrollToBottom('smooth'), 50);
  
  // 5. Send to server in background (no loading state)
  try {
    const sentMessage = await messageService.sendTextMessage(
      otherParticipant.id, 
      messageContent, 
      replyTo || undefined
    );
    
    if (sentMessage) {
      // Replace temp message with real one
      setMessages(prev => 
        prev.map(m => m.id === tempId ? sentMessage : m)
      );
    }
    
    // Update thread list in background (no await, non-blocking)
    loadThreads();
    
  } catch (error) {
    console.error('Error sending message:', error);
    // Remove optimistic message on error
    setMessages(prev => prev.filter(m => m.id !== tempId));
    // Optionally: show error toast
  }
}, [newMessage, selectedThread, user, replyingToMessage, scrollToBottom, loadThreads]);
```

### Fase 2: Aggiungere stato "sending" visivo (opzionale)

Per mostrare che il messaggio è in fase di invio, possiamo aggiungere un indicatore visivo:

```typescript
// Nel optimisticMessage, aggiungere un flag
const optimisticMessage = {
  ...
  _isPending: true  // Flag locale per UI
};

// Nel MessageBubble, mostrare un indicatore
{message._isPending && (
  <span className="text-xs text-muted-foreground ml-1">⏳</span>
)}
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/MessagesPage.tsx` | Refactor `handleSendMessage` con optimistic UI |

---

## Risultato Atteso

**Prima:**
1. Utente preme "Invia"
2. Input si blocca (disabled)
3. Tutta la chat scompare → spinner
4. Messaggi si ricaricano
5. Messaggio appare

**Dopo:**
1. Utente preme "Invia"
2. Input si svuota istantaneamente
3. Messaggio appare subito nella chat (con scroll smooth)
4. Server salva in background (invisibile all'utente)
5. Nessun loading, esperienza istantanea

---

## Benefici

1. **UX istantanea** - Il messaggio appare in meno di 50ms
2. **No interruzioni** - La chat non scompare mai
3. **Riduzione carico server** - Non ricarica tutti i messaggi ad ogni invio
4. **Pattern standard** - Come WhatsApp, iMessage, Telegram

---

## Note Tecniche

1. Il messaggio ottimistico viene creato con un ID temporaneo `temp-{timestamp}`
2. Quando il server risponde, l'ID temporaneo viene sostituito con l'ID reale del database
3. In caso di errore, il messaggio ottimistico viene rimosso dalla lista
4. `loadThreads()` viene chiamato senza `await` per non bloccare l'UI

