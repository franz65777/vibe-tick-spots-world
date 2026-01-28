

# Piano: Fix Add Page Overlay - Eliminare Strati Sovrapposti

## Problema Identificato

Quando l'utente clicca sulla X per chiudere l'Add overlay, deve farlo **3 volte** perche ci sono strati sovrapposti. L'analisi del codice ha rivelato:

### Causa Principale

Il problema e nel cleanup dell'effetto in `AddPageOverlay.tsx` (linee 85-113):

```tsx
useEffect(() => {
  // ... setup con isOpen === true

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    document.body.removeAttribute('data-modal-open');  // Problema!
    window.dispatchEvent(new CustomEvent('ui:overlay-close'));
  };
}, [isOpen, onClose]);  // Dipendenze che possono cambiare
```

**Il bug**: La cleanup viene eseguita ogni volta che `onClose` cambia identita (e in React questo succede spesso perche viene ricreata a ogni render del parent). Questo causa:
1. Rimozione prematura di `data-modal-open`
2. Dispatch di `ui:overlay-close` mentre il modal e ancora aperto
3. Stato inconsistente tra piu modali

### Problemi Secondari

1. **`MapSection.tsx`** chiama `removeAttribute('data-modal-open')` in 3 punti diversi
2. **`PinDetailCard.tsx`** imposta/rimuove `data-modal-open` per i suoi sub-modali
3. Nessun "counter" o gestione centralizzata per tracking di modali multipli

---

## Soluzione

### 1. Separare Setup da Cleanup in AddPageOverlay.tsx

Usare un ref per tracciare lo stato corrente e pulire solo quando effettivamente chiuso:

```tsx
// Ref per tracciare se abbiamo settato l'attributo
const didSetModalOpenRef = useRef(false);

useEffect(() => {
  if (isOpen) {
    // Marcare che abbiamo settato noi l'attributo
    didSetModalOpenRef.current = true;
    document.body.setAttribute('data-modal-open', 'true');
    window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    window.dispatchEvent(new CustomEvent('close-search-drawer'));
    window.dispatchEvent(new CustomEvent('close-filter-dropdown'));
    window.dispatchEvent(new CustomEvent('close-city-selector'));
    window.dispatchEvent(new CustomEvent('close-list-view'));
  } else {
    // Solo se eravamo noi ad averlo settato
    if (didSetModalOpenRef.current) {
      didSetModalOpenRef.current = false;
      document.body.removeAttribute('data-modal-open');
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  }
}, [isOpen]); // Solo isOpen come dipendenza!

// Effetto separato per escape key - nessuna interferenza con data-modal-open
useEffect(() => {
  if (!isOpen) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

### 2. Cleanup su Unmount del Componente

Aggiungere un effetto dedicato per la pulizia al unmount:

```tsx
// Cleanup solo su unmount del componente
useEffect(() => {
  return () => {
    if (didSetModalOpenRef.current) {
      document.body.removeAttribute('data-modal-open');
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  };
}, []); // Array vuoto = solo unmount
```

---

## Dettaglio Tecnico delle Modifiche

### File: `src/components/add/AddPageOverlay.tsx`

| Linee | Modifica |
|-------|----------|
| 85-113 | Dividere l'effetto in due: uno per `data-modal-open` (solo `isOpen` dep), uno per escape key |
| Nuovo | Aggiungere `didSetModalOpenRef` per tracciare ownership dell'attributo |
| Nuovo | Effetto separato per cleanup su unmount |

### Codice Finale dell'Effetto

```tsx
// Ref per tracciare se questo overlay ha settato data-modal-open
const didSetModalOpenRef = useRef(false);

// Gestione data-modal-open - reagisce solo a isOpen
useEffect(() => {
  if (isOpen) {
    didSetModalOpenRef.current = true;
    document.body.setAttribute('data-modal-open', 'true');
    window.dispatchEvent(new CustomEvent('ui:overlay-open'));
    // Chiudi altri overlay
    window.dispatchEvent(new CustomEvent('close-search-drawer'));
    window.dispatchEvent(new CustomEvent('close-filter-dropdown'));
    window.dispatchEvent(new CustomEvent('close-city-selector'));
    window.dispatchEvent(new CustomEvent('close-list-view'));
  } else if (didSetModalOpenRef.current) {
    didSetModalOpenRef.current = false;
    document.body.removeAttribute('data-modal-open');
    window.dispatchEvent(new CustomEvent('ui:overlay-close'));
  }
}, [isOpen]);

// Escape key handler - separato per evitare interferenze
useEffect(() => {
  if (!isOpen) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);

// Cleanup su unmount
useEffect(() => {
  return () => {
    if (didSetModalOpenRef.current) {
      document.body.removeAttribute('data-modal-open');
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    }
  };
}, []);
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/components/add/AddPageOverlay.tsx` | Ristrutturare gli effetti come descritto sopra |

---

## Risultato Atteso

1. **Un solo click sulla X** chiude l'overlay
2. `data-modal-open` viene rimosso solo quando l'overlay si chiude effettivamente
3. Nessuna interferenza con altri componenti che usano lo stesso attributo
4. Cleanup corretto anche se il componente viene unmontato durante la navigazione

