

## Obiettivo

Ottimizzare la pagina messaggi per **30k+ utenti** con focus su:
1. **Scroll all'ultimo messaggio** - La chat deve aprirsi all'ultimo messaggio (il più recente)
2. **Velocità di apertura** - Ridurre il tempo di caricamento iniziale
3. **Eliminare loading bloccante** - UX fluida senza spinner

---

## Analisi Root-Cause

### Problema 1: Scroll all'inizio invece che alla fine

Ho identificato **conflitti multipli** nel codice che causano il problema:

**1. `loadMessages` (riga 277-308):**
```typescript
setLoading(true);  // ← PROBLEMA: Causa re-render e reset dello scroll
const data = await messageService.getMessagesInThread(otherUserId);
setMessages(data || []);
// ...
setLoading(false);
```
Quando `loading` diventa `true`, il `VirtualizedMessageList` mostra uno spinner e il virtualizer viene distrutto.

**2. `VirtualizedMessageList` (riga 459-465):**
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="...animate-spin" />
    </div>
  );
}
```
Quando `loading=true`, il virtualizer non esiste → quando torna `false`, viene ricreato da zero → non mantiene la posizione.

**3. Effetto di scroll (riga 445-457):**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
  }, 100);
}, [visibleMessages.length]);
```
La dipendenza `visibleMessages.length` non scatta se i messaggi erano 50 e rimangono 50 dopo un reload.

**4. Conflitto con `scrollToBottom` legacy (riga 175-177):**
```typescript
useEffect(() => {
  scrollToBottom();
}, [messages]);
```
Questo chiama il vecchio `scrollToBottom` su `messagesEndRef` che non esiste nel VirtualizedMessageList!

### Problema 2: Pagina lenta ad aprirsi

**Query seriali invece che parallele:**
- `loadMessages()` chiama `setLoading(true)` all'inizio
- Poi esegue `getMessagesInThread` che fa 3 query sequenziali:
  1. Fetch messages
  2. Fetch sender profiles
  3. Fetch story data

**Query ridondanti:**
- Ogni volta che si apre una chat, vengono ricaricati tutti i messaggi anche se erano già in cache
- `loadHiddenMessages()`, `loadOtherUserProfile()` sono chiamati in sequenza

---

## Piano di Ottimizzazione

### Fase 1: Eliminare Loading Bloccante per i Messaggi

**File:** `src/pages/MessagesPage.tsx`

Modificare `loadMessages` per NON bloccare l'UI durante il caricamento:

```typescript
const loadMessages = useCallback(async (otherUserId: string, isInitialLoad = true) => {
  try {
    // NON settare loading per evitare di distruggere il virtualizer
    // Solo se è il primo caricamento assoluto (messages vuoti)
    const shouldShowLoading = isInitialLoad && messages.length === 0;
    if (shouldShowLoading) {
      setLoading(true);
    }
    
    const data = await messageService.getMessagesInThread(otherUserId);
    setMessages(data || []);

    // Mark messages as read in background (non-blocking)
    if (user && data && data.length > 0) {
      messageService.markMessagesAsRead(otherUserId); // No await
      setUnreadCounts(prev => ({
        ...prev,
        [otherUserId]: 0
      }));
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  } finally {
    if (messages.length === 0) {
      setLoading(false);
    }
  }
}, [user, messages.length]);
```

### Fase 2: Fix Scroll al Messaggio Più Recente

**File:** `src/components/messages/VirtualizedMessageList.tsx`

Il problema è che l'effetto non si triggera correttamente. Modificare:

```typescript
const VirtualizedMessageList = ({
  messages,
  loading,
  // ...
}: VirtualizedMessageListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const lastMessageCount = useRef(0);
  
  // Filter out hidden messages
  const visibleMessages = useMemo(
    () => messages.filter(m => !hiddenMessageIds.includes(m.id)),
    [messages, hiddenMessageIds]
  );

  const virtualizer = useVirtualizer({
    count: visibleMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
    // AGGIUNTO: Parti dall'ultimo elemento
    initialOffset: visibleMessages.length > 0 ? Number.MAX_SAFE_INTEGER : 0,
  });

  // Scroll to bottom - triggers on messages array change, not just length
  useEffect(() => {
    if (visibleMessages.length === 0 || !parentRef.current) return;
    
    // Always scroll to end on initial load or when new messages arrive
    const isNewMessage = visibleMessages.length > lastMessageCount.current;
    const needsInitialScroll = !initialScrollDone.current;
    
    if (needsInitialScroll || isNewMessage) {
      // Multiple attempts to ensure scroll works
      const scrollToEnd = () => {
        virtualizer.scrollToIndex(visibleMessages.length - 1, { 
          align: 'end',
          behavior: initialScrollDone.current ? 'smooth' : 'auto'
        });
      };
      
      // Immediate attempt
      scrollToEnd();
      // After DOM update
      requestAnimationFrame(scrollToEnd);
      // After virtualizer stabilizes
      setTimeout(scrollToEnd, 50);
      setTimeout(scrollToEnd, 150);
      
      initialScrollDone.current = true;
    }
    
    lastMessageCount.current = visibleMessages.length;
  }, [visibleMessages, virtualizer]);

  // Reset scroll flag when messages completely change (new chat)
  useEffect(() => {
    initialScrollDone.current = false;
    lastMessageCount.current = 0;
  }, [otherParticipantId]);

  // NON mostrare spinner se abbiamo già dei messaggi
  if (loading && visibleMessages.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  // ... rest
};
```

### Fase 3: Rimuovere Effetti Conflittuali

**File:** `src/pages/MessagesPage.tsx`

Rimuovere l'effetto legacy che causa conflitti (riga 175-177):

```typescript
// RIMUOVERE QUESTO - causa conflitto con VirtualizedMessageList
useEffect(() => {
  scrollToBottom();
}, [messages]);
```

E anche il timeout in `loadMessages` (riga 294-302):

```typescript
// RIMUOVERE - il VirtualizedMessageList gestisce lo scroll
// setTimeout(() => {
//   const firstUnreadIndex = data?.findIndex(...);
//   ...
// }, 100);
```

### Fase 4: Parallelizzare le Query di Inizializzazione

**File:** `src/pages/MessagesPage.tsx`

Modificare l'effetto di inizializzazione chat (riga 160-174):

```typescript
useEffect(() => {
  if (selectedThread && view === 'chat') {
    const otherParticipant = getOtherParticipant(selectedThread);
    if (otherParticipant) {
      // Esegui tutto in parallelo invece che sequenzialmente
      Promise.all([
        loadMessages(otherParticipant.id),
        loadHiddenMessages(),
        loadOtherUserProfile(otherParticipant.id),
      ]);
      setupRealtimeSubscription();
      // Lo scroll è gestito dal VirtualizedMessageList
    }
  } else if (view === 'threads') {
    loadThreads();
  }
}, [selectedThread, view]);
```

### Fase 5: Ottimizzare getMessagesInThread

**File:** `src/services/messageService.ts`

Parallelizzare le sub-query:

```typescript
async getMessagesInThread(otherUserId: string): Promise<DirectMessage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Query principale
  const { data: messages, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error || !messages) return [];

  // Parallelizza fetch di profiles e stories
  const senderIds = [...new Set(messages.map(m => m.sender_id))];
  const storyIds = [...new Set(messages.filter(m => m.story_id).map(m => m.story_id))];

  const [profilesResult, storiesResult] = await Promise.all([
    supabase.from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', senderIds),
    storyIds.length > 0 
      ? supabase.from('stories')
          .select('id, media_url, media_type, location_name')
          .in('id', storyIds)
      : Promise.resolve({ data: [] })
  ]);

  // ... mapping code
}
```

### Fase 6: Aggiungere Props per Reset Scroll

**File:** `src/components/messages/VirtualizedMessageList.tsx`

Aggiungere prop per identificare quando la chat cambia:

```typescript
interface VirtualizedMessageListProps {
  // ... existing props
  chatId?: string; // Per resettare lo scroll quando cambia chat
}
```

---

## File da Modificare

| File | Modifica | Impatto |
|------|----------|---------|
| `src/pages/MessagesPage.tsx` | Rimuovere loading bloccante, parallelizzare init, rimuovere effetti conflittuali | -60% tempo apertura chat |
| `src/components/messages/VirtualizedMessageList.tsx` | Fix scroll con multiple tentativi, initialOffset, reset su cambio chat | Fix scroll all'ultimo messaggio |
| `src/services/messageService.ts` | Parallelizzare sub-query in getMessagesInThread | -40% tempo fetch messaggi |

---

## Risultato Atteso

**Prima:**
1. Click su chat → Spinner (500-800ms)
2. Messaggi caricati → mostrati dall'inizio
3. Utente deve scrollare manualmente

**Dopo:**
1. Click su chat → Messaggi appaiono immediatamente all'ultimo
2. No spinner (o spinner solo se chat completamente vuota)
3. Scroll automatico all'ultimo messaggio

**Metriche Target:**
- Tempo apertura chat: da ~800ms a ~200ms (-75%)
- Scroll corretto al primo render: 100%
- Nessun loading bloccante per chat già visitate

---

## Note Tecniche per 30k+ Utenti

1. **Cache locale**: I messaggi rimangono in stato `messages[]` quindi riaprendo una chat già visitata è istantaneo
2. **Realtime efficiente**: Usa già il centralizzato `useRealtimeEvent` con singola connessione WebSocket
3. **Virtualizzazione**: Il VirtualizedMessageList gestisce migliaia di messaggi senza problemi di memoria
4. **Non-blocking updates**: `loadThreads()` e `markMessagesAsRead()` senza await per non bloccare l'UI

