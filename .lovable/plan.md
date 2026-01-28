

## Obiettivo

Risolvere due problemi critici:
1. **Chat che si apre all'inizio invece che all'ultimo messaggio** - priorità massima
2. **Foto del luogo non mostrata nell'anteprima di risposta** - quando si risponde a un place_share

---

## Problema 1: Scroll della Chat

### Analisi Root-Cause
Il `VirtualizedMessageList` usa un effetto per scrollare all'ultimo messaggio:
```typescript
useEffect(() => {
  if (visibleMessages.length > 0 && parentRef.current) {
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
    });
  }
}, [visibleMessages.length]);
```

Il problema è che:
- La dipendenza è `visibleMessages.length`
- Se i messaggi vengono caricati tutti in una volta (es. 50 messaggi), l'effetto si triggera una sola volta
- Ma a quel punto il virtualizer potrebbe non essere ancora pronto (il DOM non è completamente renderizzato)
- `requestAnimationFrame` potrebbe non essere sufficiente

### Soluzione
Modificare l'effetto per essere più robusto:

1. Aggiungere un ritardo per assicurarsi che il virtualizer sia pronto
2. Usare `initialOffset` nel virtualizer per partire dalla fine
3. Triggerare lo scroll anche al cambio di `messages` (non solo `length`)

```typescript
// Scroll to bottom when messages change or on initial load
useEffect(() => {
  if (visibleMessages.length > 0 && parentRef.current) {
    // Use setTimeout to ensure DOM is ready
    const timer = setTimeout(() => {
      virtualizer.scrollToIndex(visibleMessages.length - 1, { align: 'end' });
    }, 50);
    return () => clearTimeout(timer);
  }
}, [visibleMessages.length, virtualizer]);
```

Oppure usare la configurazione `initialOffset` del virtualizer per partire dall'ultimo elemento.

**File:** `src/components/messages/VirtualizedMessageList.tsx`

---

## Problema 2: Foto del Luogo nell'Anteprima Risposta

### Analisi Root-Cause
Nel codice attuale (righe 1057-1059):
```typescript
case 'place_share':
  thumbnailUrl = content.image_url || content.image || 
    (content.photos?.[0]?.photo_reference ? `https://maps.googleapis.com/...` : null);
```

La funzione `extractFirstPhotoUrl` (righe 29-42) è già definita nel file ma NON viene usata qui. Questa funzione gestisce correttamente:
- URL diretti come stringhe
- Oggetti con `url`, `photo_url`, o `src`

Ma la logica nel Reply Preview cerca solo `photos[0].photo_reference` per l'API di Google Maps.

### Soluzione
Usare `extractFirstPhotoUrl` già esistente nel file:

```typescript
case 'place_share':
  thumbnailUrl = content.image_url || content.image || extractFirstPhotoUrl(content.photos);
  break;
```

**File:** `src/pages/MessagesPage.tsx`

---

## Piano di Implementazione

### Fase 1: Fix Scroll Chat (PRIORITÀ MASSIMA)

Modificare `VirtualizedMessageList.tsx`:

1. Cambiare l'effetto di scroll per usare un timeout più affidabile
2. Aggiungere un flag per tracciare se lo scroll iniziale è stato fatto
3. Opzionalmente, usare `scrollToIndex` con `behavior: 'instant'` al primo mount

```typescript
const initialScrollDone = useRef(false);

useEffect(() => {
  if (visibleMessages.length > 0 && parentRef.current) {
    const timer = setTimeout(() => {
      virtualizer.scrollToIndex(visibleMessages.length - 1, { 
        align: 'end',
        behavior: initialScrollDone.current ? 'smooth' : 'auto'
      });
      initialScrollDone.current = true;
    }, 100);
    return () => clearTimeout(timer);
  }
}, [visibleMessages.length]);
```

### Fase 2: Fix Thumbnail Luogo

Modificare `MessagesPage.tsx` (riga 1058-1059):

Prima:
```typescript
case 'place_share':
  thumbnailUrl = content.image_url || content.image || 
    (content.photos?.[0]?.photo_reference ? `https://maps.googleapis.com/...` : null);
```

Dopo:
```typescript
case 'place_share':
  thumbnailUrl = content.image_url || content.image || extractFirstPhotoUrl(content.photos);
  break;
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/components/messages/VirtualizedMessageList.tsx` | Fix scroll iniziale con timeout e flag |
| `src/pages/MessagesPage.tsx` | Usare extractFirstPhotoUrl per thumbnail luogo |

---

## Risultato Atteso

1. **Scroll Chat**: Aprendo una chat, questa si posiziona automaticamente sull'ultimo messaggio (il più recente)
2. **Thumbnail Luogo**: Quando si risponde a un luogo condiviso, viene mostrata la foto del luogo nell'anteprima (40x40 px)

