

# Piano: Fix MessageOptionsOverlay e PlaceMessageCard

## Problemi Identificati

1. **Categoria ancora in inglese ("Restaurant")**: La traduzione non funziona nonostante il codice corretto
2. **Post centrato invece che sotto gli emoji**: `justify-center` causa il centraggio verticale
3. **Testo bianco sempre visibile**: Il colore bianco deve apparire SOLO nell'overlay, non nella chat normale

---

## Analisi Dettagliata

### Problema 1: Traduzione Categoria

La struttura i18n è corretta - `it.common.categories.restaurant = 'Ristorante'` esiste nel file `src/i18n.ts` (righe 2440-2451).

Il problema potrebbe essere:
- Il valore `placeData.category` potrebbe essere in formato diverso (maiuscolo, con spazi, ecc.)
- Esempio: se il database contiene `"Restaurant"` (con R maiuscola), il lookup `categories.Restaurant` fallisce perché la chiave è `categories.restaurant` (minuscolo)

**Soluzione**: Normalizzare la categoria a lowercase prima del lookup:

```tsx
const categoryKey = placeData.category?.toLowerCase() || '';
const translatedCategory = t(`categories.${categoryKey}`, { 
  ns: 'common',
  defaultValue: placeData.category || 'Place' 
});
```

### Problema 2: Layout - Post Non Allineato Sotto Emoji

Attualmente l'overlay usa `justify-center` che centra verticalmente il contenuto. 

**Soluzione**: Cambiare da `justify-center` a `justify-start` con un `mt-6` per posizionare il post appena sotto gli emoji:

```tsx
// PRIMA
<div className={`flex-1 flex flex-col ${...} justify-center gap-4 px-2`}>

// DOPO  
<div className={`flex-1 flex flex-col ${...} justify-start gap-4 px-2 mt-6`}>
```

### Problema 3: Testo Bianco Solo in Overlay Mode

Il `PlaceMessageCard` ora usa sempre `text-white/80` ma questo dovrebbe essere applicato SOLO quando è mostrato nell'overlay delle opzioni messaggio, non nella lista messaggi normale.

**Soluzione**: Aggiungere una prop `overlayMode` al componente:

```tsx
interface PlaceMessageCardProps {
  placeData: {...};
  onViewPlace: (place: any) => void;
  overlayMode?: boolean; // NEW - quando true, usa testo bianco
}
```

E applicare condizionalmente il colore:

```tsx
<div className={`flex items-center gap-1.5 text-xs ${
  overlayMode ? 'text-white/80' : 'text-muted-foreground'
} mt-0.5`}>
```

---

## File da Modificare

### 1. `src/components/messages/PlaceMessageCard.tsx`

**Modifiche:**
1. Aggiungere prop `overlayMode?: boolean`
2. Normalizzare la categoria a lowercase per la traduzione
3. Applicare colore testo condizionale basato su `overlayMode`

```tsx
interface PlaceMessageCardProps {
  placeData: {...};
  onViewPlace: (place: any) => void;
  overlayMode?: boolean; // NEW
}

const PlaceMessageCard = ({ placeData, onViewPlace, overlayMode = false }: PlaceMessageCardProps) => {
  // Normalize category to lowercase for translation lookup
  const categoryKey = placeData.category?.toLowerCase() || '';
  const translatedCategory = t(`categories.${categoryKey}`, { 
    ns: 'common',
    defaultValue: placeData.category || 'Place' 
  });
  
  // ... render
  <div className={`flex items-center gap-1.5 text-xs ${
    overlayMode ? 'text-white/80' : 'text-muted-foreground'
  } mt-0.5`}>
    {/* City */}
    <span className={overlayMode ? 'text-white/50' : 'text-muted-foreground/50'}>•</span>
    {/* Category */}
  </div>
}
```

### 2. `src/components/messages/MessageOptionsOverlay.tsx`

**Modifiche:**
1. Cambiare layout da `justify-center` a `justify-start` con margin-top
2. Passare `overlayMode={true}` a `PlaceMessageCard`

```tsx
// Nel renderMessageOrCard()
if (message.message_type === 'place_share' && sharedContent) {
  return (
    <div onClick={e => e.stopPropagation()}>
      <PlaceMessageCard 
        placeData={sharedContent} 
        onViewPlace={() => {}}
        overlayMode={true}  // NEW - abilita testo bianco
      />
    </div>
  );
}

// Nel layout principale
<div className={`flex-1 flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} justify-start gap-4 px-2 mt-6`}>
  {/* Post card + Actions menu */}
</div>
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `PlaceMessageCard.tsx` | 1. Aggiungere prop `overlayMode` 2. Lowercase category per traduzione 3. Colori condizionali |
| `MessageOptionsOverlay.tsx` | 1. Layout `justify-start` + `mt-6` 2. Passare `overlayMode={true}` |

---

## Risultato Atteso

1. **Categoria tradotta**: "Restaurant" → "Ristorante" (perché normalizziamo a lowercase)
2. **Layout corretto**: Il post appare subito sotto la barra emoji, non centrato
3. **Colori appropriati**: Testo bianco solo nell'overlay, colori normali nella chat

