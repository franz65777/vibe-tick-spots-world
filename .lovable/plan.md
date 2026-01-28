

## Implementazione Swipe-to-Back su Mobile per Messaggi

### Stato Attuale

Ho analizzato il codice e la situazione è la seguente:

| Pagina | SwipeBackWrapper | Stato |
|--------|------------------|-------|
| `MessagesPage.tsx` | ✅ Presente (riga 839) | Funzionante |
| `BusinessMessagesPage.tsx` | ❌ Mancante | Da aggiungere |

### Come Funziona lo Swipe Attuale

Il sistema di swipe-to-back è già implementato e funziona così:
- **Zona attiva**: Bordo sinistro dello schermo (30px)
- **Soglia di attivazione**: 80px di trascinamento
- **Feedback visivo**: Icona chevron che appare progressivamente + leggero spostamento del contenuto

Nella `MessagesPage`, il `handleBack` gestisce già correttamente tutti i casi:
- **Vista Chat** → Torna alla lista thread
- **Vista Search** → Torna alla lista thread
- **Vista Threads** → Torna alla home

---

## Modifiche da Implementare

### 1. Aggiungere SwipeBackWrapper a BusinessMessagesPage

La pagina messaggi business non ha lo swipe-to-back. Aggiungerò il wrapper:

```tsx
// src/pages/business/BusinessMessagesPage.tsx
import { SwipeBackWrapper } from '@/components/common/SwipeBackWrapper';

const BusinessMessagesPage = () => {
  // ...
  
  return (
    <SwipeBackWrapper onBack={() => navigate('/business')}>
      <div className="min-h-screen bg-background pb-24">
        {/* contenuto esistente */}
      </div>
    </SwipeBackWrapper>
  );
};
```

### 2. Limitare lo Swipe solo a Mobile (Opzionale)

Attualmente lo swipe funziona su tutti i dispositivi. Se vuoi limitarlo solo a mobile, posso modificare il `SwipeBackWrapper` per usare `useIsMobile()`:

```tsx
// src/components/common/SwipeBackWrapper.tsx
import { useIsMobile } from '@/hooks/use-mobile';

export const SwipeBackWrapper = ({ children, onBack, enabled = true }) => {
  const isMobile = useIsMobile();
  
  // Disabilita swipe su desktop
  const isEnabled = enabled && isMobile;
  
  const { containerRef, isSwipingBack, swipeProgress } = useSwipeBack(onBack, {
    enabled: isEnabled,
    edgeWidth: 30,
    threshold: 80
  });
  
  // ...
};
```

---

## Riepilogo File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/business/BusinessMessagesPage.tsx` | Aggiungere `SwipeBackWrapper` |
| `src/components/common/SwipeBackWrapper.tsx` | (Opzionale) Aggiungere controllo mobile-only |

---

## Note

- Lo swipe nella `MessagesPage` è già completamente funzionante per tutte le viste (threads, chat, search)
- Il feedback visivo (chevron + trascinamento contenuto) offre una UX nativa iOS-like
- L'edge zone di 30px è sufficientemente piccola da non interferire con altri gesti (come lo swipe-to-reply sui messaggi)

