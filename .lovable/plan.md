
# Piano: UI Fix per Feed Post - Truncation, Icon Size e Likes Drawer Premium

## Problema 1: Nome Location Troncato Troppo Presto

### Stato Attuale
```typescript
// FeedPostItem.tsx - linea 348
<span className="truncate max-w-[140px]">{locationName}</span>
```

Il limite di 140px taglia "National Gallery of Irel..." quando c'e' spazio disponibile.

### Soluzione
Aumentare il limite a 200px per sfruttare lo spazio orizzontale:

```typescript
<span className="truncate max-w-[200px]">{locationName}</span>
```

**File**: `src/components/feed/FeedPostItem.tsx` (linea 348)

---

## Problema 2: Icone Like/Share/Comment di Dimensioni Diverse

### Stato Attuale (PostActions.tsx)
| Bottone | Icona | Dimensione |
|---------|-------|------------|
| Like | Heart | `w-5 h-5` (20px) |
| Comment | ChatIcon | `size={20}` (20px) |
| Share | Share2 | `w-4.5 h-4.5` (18px) - PIU' PICCOLA! |

L'icona Share e' piu' piccola delle altre.

### Soluzione
Uniformare tutte le icone a 20px:

```typescript
// Comment button - gia' corretto
<ChatIcon size={20} />

// Share button - da correggere
<Share2 className="w-5 h-5" />  // Era w-4.5 h-4.5
```

**File**: `src/components/feed/PostActions.tsx` (linea 371)

---

## Problema 3: LikersDrawer Non Premium (vs CommentDrawer)

### Confronto Attuale

| Caratteristica | CommentDrawer | LikersDrawer |
|----------------|---------------|--------------|
| Background | `bg-[#F5F1EA]/90 backdrop-blur-xl` | `bg-background` (solido) |
| Overlay | `bg-black/40` | Nessuno custom |
| Rounded | `rounded-t-3xl` | `rounded-t-[20px]` |
| z-index | `z-[2147483647]` (max) | `z-[4000]` |
| Search | Emoji 🔍 nel placeholder | Icona Lucide Search |
| Input style | `rounded-full h-12 bg-white` | `pl-9 bg-muted/50 border-0` |
| Handle | Custom centered | Component default |
| Header | Centered, no border | Con bordi |

### Soluzione: Redesign Completo LikersDrawer

Allineare LikersDrawer allo stile premium di CommentDrawer:

```tsx
// LikersDrawer.tsx - Nuovo design
<Drawer.Root 
  open={isOpen} 
  onOpenChange={(open) => {
    if (!open) onClose();
  }}
  modal={true}
  dismissible={true}
>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[2147483647]" onClick={onClose} />
    <Drawer.Content 
      className="fixed inset-x-0 bottom-0 z-[2147483647] bg-[#F5F1EA]/90 dark:bg-background/90 backdrop-blur-xl rounded-t-3xl flex flex-col outline-none shadow-2xl"
      style={{
        height: '85vh',
        maxHeight: '85vh',
      }}
    >
      {/* Handle bar - centered come CommentDrawer */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-center px-4 py-3 shrink-0">
        <h3 className="font-semibold text-base">
          {t('likes', { ns: 'common', defaultValue: 'Likes' })}
        </h3>
      </div>

      {/* Search bar - stile premium con emoji */}
      <div className="px-4 pb-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base">🔍</span>
          <Input
            placeholder={t('search', { ns: 'common', defaultValue: 'Cerca' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-full bg-white dark:bg-muted border-0 text-base shadow-sm"
          />
        </div>
      </div>

      {/* Lista utenti con ScrollArea */}
      <ScrollArea className="flex-1 px-4">
        ...
      </ScrollArea>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

**File**: `src/components/social/LikersDrawer.tsx`

### Modifiche Dettagliate

1. **Cambiare import Drawer**: Da `@/components/ui/drawer` a `vaul` direttamente (come CommentDrawer)
2. **Overlay z-index**: `z-[2147483647]` (massimo, come CommentDrawer)
3. **Background glassmorphism**: `bg-[#F5F1EA]/90 dark:bg-background/90 backdrop-blur-xl`
4. **Rounded corners**: `rounded-t-3xl` (piu' arrotondato)
5. **Handle bar**: Custom centered `w-10 h-1.5`
6. **Search input**: Emoji 🔍 + `rounded-full h-12 bg-white`
7. **Altezza fissa**: `85vh` come CommentDrawer
8. **Avatar utenti**: Gia' ok (`w-12 h-12`)
9. **Follow button**: Gia' ok, ma aggiungere `rounded-full` per coerenza pill-style

---

## Riepilogo File da Modificare

| File | Modifica | Impatto |
|------|----------|---------|
| `src/components/feed/FeedPostItem.tsx` | `max-w-[140px]` → `max-w-[200px]` | UI |
| `src/components/feed/PostActions.tsx` | `w-4.5 h-4.5` → `w-5 h-5` per Share | UI |
| `src/components/social/LikersDrawer.tsx` | Redesign completo stile CommentDrawer | UI |

---

## Impatto Visivo Finale

| Elemento | Prima | Dopo |
|----------|-------|------|
| Location name | "National Gallery of Irel..." | "National Gallery of Ireland..." |
| Share icon | 18px (piu' piccola) | 20px (uguale a like/comment) |
| Likes drawer | Sfondo solido, basic | Glassmorphism premium, emoji search |
