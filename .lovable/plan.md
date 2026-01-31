
# Piano: Miglioramento Design Review Cards

## Panoramica
Miglioro le review cards nel profilo rendendo il bottone elimina uguale a quello dei post foto e riposizionandolo in modo che non copra il contenuto della card. Aggiungo anche alcuni miglioramenti visivi generali.

## Modifiche Proposte

### 1. Bottone Elimina - Stile Unificato
Attualmente il bottone elimina nelle review cards usa uno stile diverso (rosso, circolare, piccolo) rispetto ai post foto. Lo allineo allo stile dei post nella griglia:

**Stile attuale (review cards):**
- `w-6 h-6 bg-red-500/90 rounded-full`
- Posizione: `absolute top-3 left-[72px]` (copre la card)

**Nuovo stile (uguale ai post):**
- `w-7 h-9 bg-muted-foreground/70 hover:bg-muted-foreground/90 rounded-xl`
- Icona più grande: `w-4 h-5`
- Appare solo al hover: `opacity-0 group-hover:opacity-100`

### 2. Posizionamento Bottone Elimina
Sposto il bottone in una posizione che non copra il contenuto principale:

**Opzione scelta: Angolo in basso a sinistra della thumbnail**
- Posizione: `absolute bottom-0 left-0`
- Si sovrappone leggermente alla thumbnail ma non al testo
- Visibile solo al hover della card

### 3. Miglioramenti Visivi Card
- Aumentare leggermente il padding per respiro
- Migliorare la transizione hover
- Aggiungere un leggero effetto di elevazione

## Dettagli Tecnici

### File da Modificare
- `src/components/profile/PostsGrid.tsx` (linee 614-627)

### Codice Attuale (linee 614-627)
```tsx
{isOwnProfile && (
  <button
    onClick={(e) => handleDeletePost(post.id, e)}
    disabled={deleting}
    className="absolute top-3 left-[72px] w-6 h-6 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
    title="Delete review"
  >
    {deleting ? (
      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    ) : (
      <img src={deleteIcon} alt="" className="w-3 h-3" />
    )}
  </button>
)}
```

### Nuovo Codice
Il bottone sarà spostato all'interno del container della thumbnail (linee 400-440) con lo stesso stile dei post nella griglia:

```tsx
<button
  onClick={(e) => {
    if (post.locations) {
      e.stopPropagation();
      // ... location click logic
    }
  }}
  className="shrink-0 relative group/thumb"
>
  <Avatar className="h-14 w-14 rounded-2xl ...">
    ...
  </Avatar>
  {/* Delete button - positioned on thumbnail */}
  {isOwnProfile && (
    <button
      onClick={(e) => handleDeletePost(post.id, e)}
      disabled={deleting}
      className="absolute -bottom-1 -left-1 w-7 h-9 bg-muted-foreground/70 hover:bg-muted-foreground/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
      title="Delete review"
    >
      {deleting ? (
        <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <img src={deleteIcon} alt="" className="w-4 h-5" />
      )}
    </button>
  )}
</button>
```

### Struttura Finale Card

```text
+-----------------------------------------------+
|  [Thumb]   Location Name              [9.2]  |
|  [+Del]    City                       [x2]   |
|            "Caption text..."                  |
|                                       [📷📷]  |
|------------------------------------------------|
|  ♥ 1   💬 0   Restaurant      8 NOVEMBER 2025 |
+-----------------------------------------------+
```

Il bottone elimina sarà:
- Sovrapposto in basso a sinistra sulla thumbnail
- Stile grigio semi-trasparente con rounded-xl
- Visibile solo al hover della card (non al hover della thumbnail)
- Icona bianca come nei post foto

## Riepilogo
- ✅ Bottone elimina con stile unificato ai post foto
- ✅ Posizionamento che non copre il contenuto testuale
- ✅ Icona più grande e visibile
- ✅ Transizione hover fluida
