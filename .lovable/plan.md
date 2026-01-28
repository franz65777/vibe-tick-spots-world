

## Obiettivo

Ristrutturare e ottimizzare la pagina messaggi per:
1. **Dividere il file monolitico** da 1368 righe in componenti modulari
2. **Eliminare il cerchio di loading** che blocca l'UI durante i caricamenti
3. **Rimuovere la logica story_data legacy** dove possibile (mantenendo solo il necessario per story_reply)
4. **Garantire lo scroll all'ultimo messaggio**

---

## Analisi dei Problemi

### Problema 1: File troppo grande (1368 righe)
`MessagesPage.tsx` contiene:
- Gestione stato (40+ useState)
- Logica thread/chat/search
- Modali per condivisione luoghi
- Gestione storie
- Gestione reazioni
- Formattazione tempo
- Utility functions

### Problema 2: Loading bloccante
Un singolo stato `loading` viene usato per tutto:
```typescript
const [loading, setLoading] = useState(true);
// Usato sia per threads che per messages
```

Quando si entra nella chat, `loadMessages` setta `loading=true` → il `VirtualizedThreadList` e `VirtualizedMessageList` mostrano entrambi lo spinner.

### Problema 3: Story data ancora presente
In `messageService.ts` (righe 311-328) c'è ancora:
```typescript
const storyIds = [...new Set(messages.filter(m => m.story_id).map(m => m.story_id))];
// Fetch stories...
```
Questo rallenta il caricamento anche se le storie non sono più usate attivamente.

---

## Piano di Ristrutturazione

### Fase 1: Separare gli stati di loading

Sostituire il singolo `loading` con stati separati:

```typescript
// Prima
const [loading, setLoading] = useState(true);

// Dopo
const [threadsLoading, setThreadsLoading] = useState(true);
const [messagesLoading, setMessagesLoading] = useState(false);
```

Questo permette di:
- Mostrare lo skeleton/spinner SOLO per la sezione che sta caricando
- Non bloccare la chat quando si caricano i threads
- Non mostrare spinner nella chat se ci sono già messaggi

### Fase 2: Estrarre componenti dedicati

Creare nuovi file per ridurre la complessità:

| Nuovo File | Responsabilità | Righe stimate |
|------------|----------------|---------------|
| `src/components/messages/ChatView.tsx` | View della chat con input, reply preview | ~200 |
| `src/components/messages/SearchView.tsx` | Ricerca contatti, frequent/suggested | ~150 |
| `src/components/messages/SavedPlacesModal.tsx` | Modal condivisione luoghi | ~100 |
| `src/components/messages/UserSelectModal.tsx` | Modal selezione utente | ~80 |
| `src/hooks/useMessageState.ts` | Hook per gestione stato messaggi | ~150 |
| `src/hooks/useMessageHandlers.ts` | Hook per handler (send, delete, react) | ~200 |

**Risultato:** `MessagesPage.tsx` passa da 1368 righe a ~400 righe.

### Fase 3: Rimuovere logica story_data legacy

Modificare `messageService.ts` per:
1. **NON** fetchare più le storie in `getMessagesInThread`
2. Usare solo `shared_content` per i dati delle storie (già popolato quando il messaggio viene creato)

```typescript
// PRIMA (rallenta il caricamento)
const storyIds = [...new Set(messages.filter(m => m.story_id).map(m => m.story_id))];
const storiesResult = await supabase.from('stories')...

// DOPO (elimina query extra)
// story_id viene ancora letto ma i dati vengono presi da shared_content
// che è già popolato al momento dell'invio del messaggio
```

### Fase 4: Skeleton UI invece di Spinner

Sostituire gli spinner con skeleton UI per una percezione di velocità maggiore:

```tsx
// VirtualizedMessageList.tsx - Prima
if (loading && visibleMessages.length === 0) {
  return <div className="...animate-spin" />;
}

// Dopo - Skeleton per messaggi
if (messagesLoading && visibleMessages.length === 0) {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Fase 5: Ottimizzare scroll all'ultimo messaggio

Modificare `VirtualizedMessageList.tsx` per usare `initialOffset`:

```typescript
const virtualizer = useVirtualizer({
  count: visibleMessages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
  overscan: 10,
  // Parti dalla fine del contenuto
  initialOffset: Infinity,
});
```

E forzare lo scroll dopo il mount:

```typescript
useEffect(() => {
  if (visibleMessages.length === 0) return;
  
  // Forza scroll immediato senza animazione
  queueMicrotask(() => {
    virtualizer.scrollToIndex(visibleMessages.length - 1, { 
      align: 'end', 
      behavior: 'auto' 
    });
  });
}, [visibleMessages.length > 0]); // Solo al primo caricamento
```

---

## File da Modificare/Creare

| File | Azione | Impatto |
|------|--------|---------|
| `src/pages/MessagesPage.tsx` | Refactor: estrarre componenti, separare loading states | -60% righe, codice più leggibile |
| `src/components/messages/ChatView.tsx` | Nuovo: view chat con input | Modularità |
| `src/components/messages/SearchView.tsx` | Nuovo: ricerca contatti | Modularità |
| `src/components/messages/MessageSkeleton.tsx` | Nuovo: skeleton UI per messaggi | UX migliorata |
| `src/components/messages/ThreadSkeleton.tsx` | Nuovo: skeleton UI per threads | UX migliorata |
| `src/components/messages/VirtualizedMessageList.tsx` | Modifica: skeleton + fix scroll | No spinner + scroll corretto |
| `src/components/messages/VirtualizedThreadList.tsx` | Modifica: skeleton invece di spinner | UX migliorata |
| `src/services/messageService.ts` | Modifica: rimuovere fetch stories | -40% tempo caricamento |
| `src/hooks/useMessageState.ts` | Nuovo: gestione stato centralizzata | Manutenibilità |

---

## Risultato Atteso

**Prima:**
- 1 file da 1368 righe
- Spinner bloccante su ogni cambio view
- Caricamento lento (fetch storie non necessario)
- Scroll random (a volte inizio, a volte fine)

**Dopo:**
- File principale ~400 righe + componenti modulari
- Skeleton UI fluida, nessun blocco
- Caricamento -40% più veloce
- Scroll sempre all'ultimo messaggio

**Metriche Target:**
- Tempo apertura chat: da ~600ms a ~200ms
- Perceived loading time: istantaneo (skeleton)
- Scroll corretto: 100% dei casi
- Manutenibilità: +80% (file più piccoli e focalizzati)

---

## Note Tecniche

1. **Story data**: Il campo `story_id` resta nel DB ma non viene più fetchato. I dati delle storie sono in `shared_content` già al momento dell'invio.

2. **Loading states**: Separare in `threadsLoading` e `messagesLoading` evita che un caricamento interferisca con l'altro.

3. **Skeleton UI**: Usa shimmer animation già presente in `index.css` per consistenza con altre pagine.

4. **Virtualizzazione**: Il refactoring mantiene `@tanstack/react-virtual` per performance a 30k+ utenti.

