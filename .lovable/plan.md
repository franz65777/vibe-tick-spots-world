
# Piano: Migliorare la Fluidita del Loading Post dal Profilo

## Problema Attuale

Quando clicchi su un post dalla griglia del profilo:
1. Il modal mostra una **rotella di loading** per 1-3 secondi
2. Nel frattempo, **ricarica tutti i dati del post** (che sono gia stati caricati!)
3. Esperienza utente poco fluida

## Analisi Tecnica

### Flusso Attuale (Lento)
```text
Click post -> Modal apre -> Spinner -> Fetch posts -> Fetch profiles -> Fetch locations -> Mostra contenuto
              [~0ms]        [~2000ms di attesa]                                         [Content visibile]
```

### Dati Gia Disponibili
Quando clicchi su un post, `PostsGrid` ha gia caricato:
- `media_urls[]` - Le immagini del post
- `profiles` - Username e avatar
- `locations` - Nome, citta, coordinate
- `likes_count`, `comments_count`
- `caption`, `rating`, `created_at`

Questi dati vengono ignorati e il modal li ricarica da zero!

## Soluzione Proposta

### 1. Passare i Post Pre-caricati al Modal

Modificare `PostsGrid` per passare l'intero array di post gia caricati al modal:

```tsx
// PostsGrid.tsx
<PostDetailModalMobile
  postId={selectedPostId}
  userId={targetUserId}
  isOpen={!!selectedPostId}
  onClose={() => setSelectedPostId(null)}
  initialPosts={displayedPosts}  // <- NUOVO: passa i dati gia caricati
/>
```

### 2. Usare i Dati Iniziali nel Modal

Modificare `PostDetailModalMobile` per accettare e usare i post pre-caricati:

```tsx
// PostDetailModalMobile.tsx
interface PostDetailModalMobileProps {
  // ... props esistenti
  initialPosts?: PostData[];  // <- NUOVO
}

export const PostDetailModalMobile = ({ ..., initialPosts }: PostDetailModalMobileProps) => {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && postId) {
      // Se abbiamo dati iniziali, usali immediatamente
      if (initialPosts && initialPosts.length > 0) {
        setPosts(initialPosts);
        setLoading(false);
        return;
      }
      // Altrimenti, carica da network (fallback per altri entry points)
      loadPostData();
    }
  }, [isOpen, postId, initialPosts]);
```

### 3. Sostituire Spinner con Skeleton UI

Se per qualche motivo il loading e ancora necessario, mostrare skeleton che imita il layout del post invece di spinner:

```tsx
// Prima (spinner generico)
<div className="fixed inset-0 ... flex items-center justify-center">
  <div className="w-8 h-8 border-2 ... animate-spin" />
</div>

// Dopo (skeleton strutturato)
<div className="fixed inset-0 ... overflow-y-auto">
  {/* Header skeleton */}
  <div className="sticky top-0 ...">
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 bg-muted rounded shimmer-skeleton" />
      <div className="h-5 w-20 bg-muted rounded shimmer-skeleton" />
    </div>
  </div>
  
  {/* Post skeleton */}
  <article className="post-compact">
    <div className="post-compact-header">
      <div className="h-10 w-10 rounded-full bg-muted shimmer-skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-28 bg-muted rounded shimmer-skeleton" />
        <div className="h-3 w-36 bg-muted rounded shimmer-skeleton" />
      </div>
    </div>
    <div className="aspect-square w-full bg-muted shimmer-skeleton" />
    <div className="post-compact-actions space-y-2">
      <div className="flex gap-1.5">
        <div className="h-9 w-12 bg-muted rounded-lg shimmer-skeleton" />
        <div className="h-9 w-14 bg-muted rounded-lg shimmer-skeleton" />
      </div>
    </div>
  </article>
</div>
```

### 4. Pre-caricare Immagini (Opzionale)

Per una transizione ancora piu fluida, pre-caricare le immagini del post cliccato:

```tsx
// VirtualizedPostGrid.tsx - nel click handler
const handleClick = async (postId: string) => {
  // Trova il post e pre-carica le sue immagini
  const clickedPost = posts.find(p => p.id === postId);
  if (clickedPost) {
    clickedPost.media_urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }
  onPostClick(postId);
};
```

## Impatto Atteso

| Metrica | Prima | Dopo |
|---------|-------|------|
| Tempo prima di vedere contenuto | ~2000ms | ~50ms |
| Richieste network | 3-4 query Supabase | 0 query |
| Esperienza visiva | Spinner -> contenuto improvviso | Transizione fluida |
| Layout shift | Alto (contenuto appare tutto insieme) | Zero |

## File da Modificare

| File | Modifica |
|------|----------|
| `src/components/profile/PostsGrid.tsx` | Passare `initialPosts` al modal |
| `src/components/explore/PostDetailModalMobile.tsx` | Accettare e usare `initialPosts`, skeleton UI |
| `src/components/profile/VirtualizedPostGrid.tsx` | Pre-caricamento immagini (opzionale) |

## Dettagli Tecnici

### Compatibilita con Altri Entry Points
Il modal puo essere aperto da vari punti:
- Pagina profilo (usa `initialPosts`)
- Mappa/pin (usa `locationId`, carica da network)
- Link diretto (usa `postId`, carica da network)

La prop `initialPosts` e opzionale, quindi il fallback al loading normale rimane per gli altri casi.

### Gestione Memoria
I post sono gia in memoria grazie a React Query in `useOptimizedPosts`. Passarli al modal non aumenta l'uso di memoria perche sono riferimenti agli stessi oggetti.

### Sincronizzazione Dati
Se i dati cambiano mentre il modal e aperto (es. nuovo like), il modal mantiene la sua copia locale. Questo e gia il comportamento attuale e va bene per la durata tipica di visualizzazione.
