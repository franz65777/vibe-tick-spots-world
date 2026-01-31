
# Piano: Miglioramento Visivo Feed Cards

## Analisi Attuale

Le feed cards (`FeedPostItem.tsx`) già utilizzano:
- Glassmorphism base: `bg-white/60 dark:bg-zinc-900/70 backdrop-blur-md`
- Gradient overlay sulle immagini
- Photo counter badge
- Rating badge overlay

Tuttavia, rimangono ancora **troppo piatte e "bianche"**. Propongo questi miglioramenti.

---

## Miglioramenti Proposti

### 1. Sfondo Gradient Sottile invece di Bianco Piatto

Sostituire `bg-white/60` con un **gradient radiale morbido** che dia profondità:

```tsx
// Prima (linea 286)
className="bg-white/60 dark:bg-zinc-900/70 backdrop-blur-md ..."

// Dopo - gradient caldo più interessante
className="bg-gradient-to-br from-white/70 via-white/50 to-amber-50/30 dark:from-zinc-900/80 dark:via-zinc-900/60 dark:to-zinc-800/40 backdrop-blur-md ..."
```

### 2. Bordo Colorato Dinamico

Aggiungere un **bordo colorato sottile** basato sulla categoria della location o sul rating:

```tsx
// Bordo con accent color invece di bianco
border-l-4 border-l-primary/30

// O basato sul rating se presente
className={cn(
  "border-l-4",
  rating && rating >= 8 ? "border-l-green-400/50" :
  rating && rating >= 5 ? "border-l-amber-400/50" :
  rating ? "border-l-red-400/50" : "border-l-primary/20"
)}
```

### 3. Header con Avatar Più Grande e Info Condensate

- Avatar da `h-10 w-10` a `h-11 w-11`
- Sfondo semi-trasparente dietro username/location per contrasto

### 4. Immagine con Inner Shadow e Corners Premium

```tsx
// Immagine con shadow interna per profondità
<div className="aspect-square w-full relative overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]">
```

### 5. Footer Actions con Background Separato

Separare visivamente le actions con uno sfondo leggermente diverso:

```tsx
<div className="post-compact-actions bg-white/40 dark:bg-white/5 ..."
```

### 6. Micro-Animazioni Hover

Aggiungere effetti hover per rendere le card più "vive":

```tsx
className="... hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
```

---

## Riepilogo Modifiche Tecniche

| File | Modifica | Linee |
|------|----------|-------|
| `FeedPostItem.tsx` | Gradient sfondo caldo | 286 |
| `FeedPostItem.tsx` | Bordo colorato laterale | 286 |
| `FeedPostItem.tsx` | Avatar leggermente più grande | 295 |
| `FeedPostItem.tsx` | Inner shadow immagini | 401, 439 |
| `FeedPostItem.tsx` | Actions footer separato | 486 |
| `FeedPostItem.tsx` | Hover micro-animations | 286 |

### Implementazione Dettagliata

**Linea 282-287 (Article container)**:
```tsx
<article
  id={`feed-post-${postId}`}
  data-feed-post-id={postId}
  className={cn(
    "post-compact mx-5 rounded-2xl overflow-hidden",
    // Gradient background caldo invece di bianco piatto
    "bg-gradient-to-br from-white/80 via-white/60 to-amber-50/40",
    "dark:from-zinc-900/80 dark:via-zinc-900/60 dark:to-zinc-800/40",
    "backdrop-blur-md",
    // Bordo premium
    "border border-white/50 dark:border-white/15",
    // Bordo laterale colorato basato su rating
    rating && rating >= 8 ? "border-l-4 border-l-green-400/50" :
    rating && rating >= 5 ? "border-l-4 border-l-amber-400/50" :
    rating && rating > 0 ? "border-l-4 border-l-red-400/50" : "",
    // Shadow e hover
    "shadow-lg shadow-black/5 dark:shadow-black/20",
    "hover:shadow-xl hover:scale-[1.005] transition-all duration-300"
  )}
>
```

**Linea 295 (Avatar)**:
```tsx
<Avatar className="h-11 w-11 ring-2 ring-white/50 dark:ring-white/20">
```

**Linea 401 e 439 (Image containers)**:
```tsx
<div className="aspect-square w-full relative overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.08)]">
```

**Linea 486 (Post actions container)**:
```tsx
<div className={cn(
  "post-compact-actions",
  "bg-gradient-to-t from-white/30 to-transparent dark:from-black/20",
  (isReviewOnly || isPromotion) && !caption ? "space-y-0" : "space-y-1"
)}>
```

---

## Risultato Visivo Atteso

Le card avranno:
- **Gradiente caldo** invece di bianco piatto (più organico)
- **Bordo laterale colorato** che indica il rating a colpo d'occhio
- **Profondità** tramite inner shadow sulle immagini
- **Micro-animazioni** al hover per interattività
- **Avatar con ring** per definizione visiva

Queste modifiche renderanno il feed significativamente più coinvolgente senza stravolgere il design esistente.
