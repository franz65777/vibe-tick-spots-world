

# Piano: Fix Traduzione Categoria + Bubble Testo Tagliata

## Problemi Identificati

### 1. Categoria non tradotta ("Restaurant" invece di "Ristorante")

**Causa**: In `PlaceMessageCard.tsx`, il componente usa `useTranslation()` senza specificare il namespace di default:

```tsx
const { t } = useTranslation(); // ❌ Non specifica 'common'
```

Anche se passiamo `ns: 'common'` nella chiamata `t()`, questo non funziona correttamente in tutti i casi perche' il namespace primario non e' impostato.

**Soluzione**: Usare `useTranslation('common')` direttamente:

```tsx
const { t } = useTranslation('common'); // ✅ Specifica il namespace
```

### 2. Bubble di testo "tagliata" nell'overlay

**Causa**: Il testo breve come "weila" appare troppo stretto perche' la bubble ha solo `max-w-[80%]` ma nessuna larghezza minima. Su testi corti, la bubble collassa.

**Soluzione**: Aggiungere un padding adeguato e assicurarsi che il contenitore non limiti la larghezza:

```tsx
// Rimuovere max-w-[80%] per permettere alla bubble di avere la sua larghezza naturale
<div className="rounded-2xl px-4 py-3 shadow-2xl ring-2 ring-white/10 ...">
```

---

## File da Modificare

### 1. `src/components/messages/PlaceMessageCard.tsx`

Cambiare la riga 54 da:
```tsx
const { t } = useTranslation();
```

A:
```tsx
const { t } = useTranslation('common');
```

Questo assicura che `t('categories.restaurant')` cerchi direttamente in `common.categories.restaurant` e trovi "Ristorante" per l'italiano.

### 2. `src/components/messages/MessageOptionsOverlay.tsx`

Modificare il rendering della text bubble (righe 105-116):
- Rimuovere `max-w-[80%]` che limita troppo la larghezza
- La bubble si adattera' naturalmente al contenuto

```tsx
// PRIMA
<div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xl ring-2 ring-white/10 ...`}>

// DOPO  
<div className={`rounded-2xl px-4 py-3 shadow-2xl ring-2 ring-white/10 ...`}>
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `PlaceMessageCard.tsx` | `useTranslation()` -> `useTranslation('common')` |
| `MessageOptionsOverlay.tsx` | Rimuovere `max-w-[80%]` dalla text bubble |

---

## Risultato Atteso

1. **Categoria tradotta**: "Restaurant" -> "Ristorante", "park" -> "Parco", ecc.
2. **Bubble non tagliata**: Il testo "weila" appara' con la sua larghezza naturale, non compresso

