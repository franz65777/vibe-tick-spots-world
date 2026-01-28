

## Riepilogo Stato Attuale

Le ottimizzazioni principali sono state implementate con successo:
- Skeleton UI per threads e messaggi
- Rimozione fetch story_data legacy  
- Loading non bloccante (primo caricamento)
- Scroll all'ultimo messaggio migliorato
- Optimistic UI per invio messaggi

## Miglioramenti Rimanenti

### 1. Separare gli Stati di Loading (Priorità Alta)

Attualmente `MessagesPage.tsx` usa ancora un singolo stato `loading` che può causare interferenze. Separare in:

```typescript
// Prima (riga 71)
const [loading, setLoading] = useState(true);

// Dopo
const [threadsLoading, setThreadsLoading] = useState(true);
const [messagesLoading, setMessagesLoading] = useState(false);
```

Questo garantisce che:
- La lista thread mostra skeleton mentre carica
- La chat non mostra skeleton se i messaggi sono già presenti
- Nessuna interferenza tra le due sezioni

### 2. Ottimizzare il Cambio Chat (Priorità Alta)

Quando si cambia chat, i vecchi messaggi rimangono visibili brevemente creando confusione. Aggiungere clear immediato:

```typescript
// In handleThreadSelect
const handleThreadSelect = useCallback((thread: MessageThread) => {
  setMessages([]); // Clear immediately
  setSelectedThread(thread);
  setView('chat');
}, []);
```

### 3. Migliorare VirtualizedMessageList per Chat Vuote (Priorità Media)

Aggiungere stato empty dedicato per nuove conversazioni:

```tsx
if (!loading && visibleMessages.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <p className="text-muted-foreground text-sm">
        {t('noMessagesYet', { ns: 'messages' })}
      </p>
    </div>
  );
}
```

### 4. Rimuovere scrollToBottom Legacy (Priorità Media)

Il `scrollToBottom` callback e il `chatViewportWrapperRef` con ResizeObserver (righe 187-216) possono interferire con il VirtualizedMessageList. Rimuovere per evitare conflitti.

### 5. Ottimizzare Input Focus (Priorità Bassa - UX Polish)

Quando si apre una chat, il focus non va automaticamente all'input. Aggiungere:

```typescript
useEffect(() => {
  if (view === 'chat' && !replyingToMessage) {
    // Delay to allow keyboard animation
    setTimeout(() => inputRef.current?.focus(), 300);
  }
}, [view]);
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/MessagesPage.tsx` | Separare loading states, rimuovere scrollToBottom legacy, ottimizzare cambio chat, focus input |
| `src/components/messages/VirtualizedMessageList.tsx` | Aggiungere empty state per nuove chat |

---

## Risultato Atteso

- Loading states completamente indipendenti tra threads e chat
- Cambio chat istantaneo senza messaggi residui
- Empty state chiaro per nuove conversazioni
- Nessun conflitto di scroll
- Focus automatico sull'input

