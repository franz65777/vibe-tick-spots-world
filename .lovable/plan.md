

## Piano: Fase 6 - Fix Timing Icona (4.05s) + Miglioramento Fluidità Overlay

---

### Parte 1: Fix Timing Icona Centratura

**Situazione Attuale (da Fase 5):**
- Delay iniziale: 200ms
- Durata animazione: 2000ms
- Threshold icona: 0.6 (60%)
- Risultato: icona appare a ~1.4 secondi

**Requisito dell'Utente:**
- Animazione logo: **4 secondi**
- Icona centratura: appare a **4.05 secondi** (50ms dopo fine animazione)

**Implementazione in `SearchDrawer.tsx`:**

```tsx
useEffect(() => {
  if (showBrandingLogo) {
    setShowLogoInBar(true);
    setLogoSlideProgress(0);
    setShowCenterIcon(false);
    
    // Delay iniziale minimo di 50ms per permettere il rendering
    const startDelay = setTimeout(() => {
      const startTime = Date.now();
      const duration = 4000; // Animazione logo: 4 secondi
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setLogoSlideProgress(eased);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animazione completata a 4s
          setShowLogoInBar(false);
          // Mostra icona dopo 50ms = 4.05s totali
          setTimeout(() => {
            setShowCenterIcon(true);
          }, 50);
        }
      };
      
      requestAnimationFrame(animate);
    }, 50);
    
    return () => clearTimeout(startDelay);
  }
}, [showBrandingLogo]);
```

---

### Parte 2: Miglioramento Fluidità Apertura Overlay

**Problema Identificato:**
Gli overlay (Messages e Notifications) usano:
```tsx
requestAnimationFrame(() => setIsVisible(true));
```

Questo può causare un "flash" perché:
1. Il componente si monta con `opacity-0`
2. Il browser non ha ancora fatto il paint
3. La transizione parte immediatamente, causando un salto visivo

**Soluzione - Double RAF Pattern:**
Usare due `requestAnimationFrame` consecutivi per assicurarsi che il browser abbia completato il paint prima di iniziare la transizione:

```tsx
// In MessagesOverlay.tsx e NotificationsOverlay.tsx
useEffect(() => {
  if (isOpen) {
    // ... setup code ...
    
    // Double RAF: prima aspetta il paint, poi inizia la transizione
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  } else {
    setIsVisible(false);
    // ... cleanup code ...
  }
}, [isOpen]);
```

Questo pattern garantisce:
1. **Primo RAF**: Schedula il callback per dopo il prossimo paint
2. **Secondo RAF**: Aspetta un altro frame, garantendo che il DOM sia completamente renderizzato
3. La transizione `duration-200` parte in modo fluido

---

### File da Modificare

1. **`src/components/home/SearchDrawer.tsx`**
   - Cambiare `duration` da 2000 a 4000
   - Rimuovere il check `eased >= 0.6`
   - Aggiungere `setTimeout(..., 50)` dopo fine animazione per mostrare icona

2. **`src/components/messages/MessagesOverlay.tsx`**
   - Sostituire singolo `requestAnimationFrame` con double RAF pattern

3. **`src/components/notifications/NotificationsOverlay.tsx`**
   - Sostituire singolo `requestAnimationFrame` con double RAF pattern

---

### Risultato Atteso

| Elemento | Prima | Dopo |
|----------|-------|------|
| Animazione logo | 2s | 4s |
| Icona centratura appare | ~1.4s | 4.05s |
| Apertura overlay Messages | Flash visivo | Transizione fluida |
| Apertura overlay Notifications | Flash visivo | Transizione fluida |

---

### Dettagli Tecnici

**SearchDrawer - Timing esatto:**
- t=0ms: Componente monta, logo visibile
- t=50ms: Animazione inizia
- t=4050ms: Animazione completa, delay 50ms
- t=4100ms: Icona centratura appare (effettivo ~4.05s dall'inizio)

**Overlay - Double RAF:**
Il pattern "double requestAnimationFrame" è una tecnica consolidata per:
- Evitare FOUC (Flash of Unstyled Content)
- Garantire che le transizioni CSS partano dopo il browser paint
- Supportato da tutti i browser moderni

