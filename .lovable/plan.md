

# Piano: Fix MessageOptionsOverlay Layout + PlaceMessageCard Styling

## Problemi Identificati

1. **Città e categoria non visibili**: Il testo è troppo scuro sullo sfondo scuro dell'overlay
2. **Ordine errato**: Emoji bar sotto il post invece che sopra
3. **Categorie non tradotte**: `PlaceMessageCard` usa `t('categories.restaurant')` senza specificare il namespace `common`

---

## Modifiche Necessarie

### 1. MessageOptionsOverlay.tsx - Nuovo Layout

Riorganizzare l'ordine verticale:

```text
+------------------------------------------+
|         SFONDO BLUR/SCURO                |
|                                          |
|  [EMOJI BAR - FISSA IN ALTO]             |
|  ❤️ 😋 🤤 😍 🪩 🎉 📍 🥇                   |
|                                          |
|  [POST/MESSAGGIO - PIÙ IN BASSO]         |
|                                          |
|  [RISPONDI + ELIMINA - SOTTO IL POST]    |
|                                          |
+------------------------------------------+
```

**Nuovo ordine nel JSX:**
1. **TOP**: Emoji bar (fissa, subito sotto safe area)
2. **MIDDLE**: Post/Message card (centrato verticalmente o più in basso)
3. **BOTTOM**: Menu azioni (Rispondi, Elimina) subito sotto il post

### 2. PlaceMessageCard.tsx - Fix Visibilità e Traduzioni

#### Problema Visibilità
Il testo città/categoria usa `text-muted-foreground` che è troppo scuro sull'overlay nero.

**Soluzione**: Aggiungere prop `variant` per overlay context:
```tsx
interface PlaceMessageCardProps {
  // ...existing props
  overlayMode?: boolean; // When true, use white text for visibility
}
```

Oppure applicare direttamente `text-white` per le info nell'overlay.

#### Problema Traduzione Categorie
Il codice attuale:
```tsx
const translatedCategory = t(`categories.${placeData.category}`, { 
  defaultValue: placeData.category || 'Place' 
});
```

Manca il namespace. Correggere in:
```tsx
const translatedCategory = t(`categories.${placeData.category}`, { 
  ns: 'common',
  defaultValue: placeData.category || 'Place' 
});
```

---

## Dettaglio Implementazione

### MessageOptionsOverlay.tsx

```tsx
return (
  <div 
    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col p-6"
    onClick={onClose}
  >
    {/* === 1. EMOJI BAR - FIXED AT TOP === */}
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} pt-safe mt-4`}>
      <div 
        className="bg-card/90 backdrop-blur-lg rounded-full px-4 py-2.5 flex items-center gap-2 shadow-xl border border-border/30"
        onClick={e => e.stopPropagation()}
      >
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="text-xl sm:text-2xl hover:scale-125 active:scale-90 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>

    {/* === 2. MESSAGE/CARD - CENTERED === */}
    <div className={`flex-1 flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} justify-center`}>
      <div className="mb-4">
        {renderMessageOrCard()}
      </div>

      {/* === 3. ACTIONS MENU - DIRECTLY BELOW MESSAGE === */}
      <div 
        className="bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-border/20 min-w-[200px]"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={handleReply} className="...">
          <Reply /> Rispondi
        </button>
        <button onClick={handleDelete} className="...">
          <Trash2 /> Elimina Messaggio
        </button>
      </div>
    </div>
  </div>
);
```

### PlaceMessageCard.tsx - Fix Categoria Tradotta

Aggiornare la riga 59:
```tsx
// PRIMA
const translatedCategory = t(`categories.${placeData.category}`, { 
  defaultValue: placeData.category || 'Place' 
});

// DOPO
const translatedCategory = t(`categories.${placeData.category}`, { 
  ns: 'common',
  defaultValue: placeData.category || 'Place' 
});
```

### PlaceMessageCard.tsx - Fix Visibilità Testo

Per garantire visibilità su sfondo scuro dell'overlay, modificare le classi del testo città/categoria.

Opzione 1 - Prop condizionale:
```tsx
// Aggiungere prop overlayMode
<div className={`text-xs ${overlayMode ? 'text-white/90' : 'text-muted-foreground'}`}>
```

Opzione 2 - Usare colori più visibili di default:
```tsx
// Usare text-white direttamente dato che la card ha sfondo scuro
<div className="text-xs text-white/80">
```

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/components/messages/MessageOptionsOverlay.tsx` | Riordinare: Emoji TOP → Post MIDDLE → Actions BOTTOM |
| `src/components/messages/PlaceMessageCard.tsx` | 1. Fix namespace categoria `ns: 'common'` 2. Testo bianco per visibilità |

---

## Risultato Atteso

1. **Layout corretto**: Emoji bar in alto → Post al centro → Rispondi/Elimina sotto il post
2. **Città/categoria visibili**: Testo bianco/chiaro su sfondo scuro
3. **Categorie tradotte**: "Restaurant" → "Ristorante" in italiano

