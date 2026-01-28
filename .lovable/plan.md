
## Piano: Ottimizzazione Feed Page per Caricamento Istantaneo e 20k+ Utenti

### Analisi della Situazione Attuale

Ho analizzato l'architettura del feed e identificato diversi colli di bottiglia che impattano i tempi di caricamento e la percezione di velocita.

---

### Problemi Identificati

#### 1. Skeleton Loading Basico (Non Coinvolgente)
```typescript
// FeedPage.tsx - Lines 566-580
{loading ? (
  <div className="py-4 w-full">
    {[1,2,3].map((i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="aspect-square w-full" />
      </div>
    ))}
  </div>
)}
```
Lo skeleton attuale e statico e non simula la struttura reale dei post.

#### 2. FeedPostItem Senza Progressive Image Loading
Le immagini nel feed appaiono con un "pop-in" brusco. Non c'e blur-up effect come implementato in PostsGrid.

#### 3. PostActions Fa Query Multiple per Ogni Post
```typescript
// PostActions.tsx - Lines 76-120
useEffect(() => {
  const loadStatus = async () => {
    // Query per google_place_id
    const { data: loc } = await supabase.from('locations').select('google_place_id')...
    // Query per user_saved_locations
    const { data: internalSave } = await supabase.from('user_saved_locations')...
    // Query per saved_places (se c'e google_place_id)
    const { data: sp } = await supabase.from('saved_places')...
  };
}, [locationId, user]);
```
Ogni post nel feed trigger 2-3 query individuali per determinare lo stato "saved".

#### 4. UserVisitedCard Query Individuali
```typescript
// UserVisitedCard.tsx - Lines 147-188
useEffect(() => {
  const checkSaveAndLikeStatus = async () => {
    // Query saved status
    const { data: savedData } = await supabase.from('user_saved_locations')...
    // Query like status
    const { data: likeData } = await supabase.from('location_likes')...
    // Query like count
    const { count } = await supabase.from('location_likes')...
  };
}, [user?.id, activity.location_id]);
```
Ogni visited card fa 3 query separate.

#### 5. useSocialEngagement Query per Ogni Post
```typescript
// useSocialEngagement.ts - Lines 40-44
const [likesResult, commentsCountResult, sharesCountResult] = await Promise.all([
  user ? engagement.getPostLikes(postId) : ...,
  supabase.from('post_comments').select('*', { count: 'exact', head: true })...,
  supabase.from('post_shares').select('*', { count: 'exact', head: true })...,
]);
```
Anche se parallelo, questo avviene per OGNI post nel feed (N+1).

#### 6. useVisitedSaves Fa Query Privacy per Ogni Utente
```typescript
// useVisitedSaves.ts - Lines 72-80
const privacyChecks = await Promise.all(
  userIds.map(async (targetUserId) => {
    const { data: canView } = await supabase.rpc('can_view_been_cards', {...});
    return { userId: targetUserId, canView: canView ?? false };
  })
);
```
N query RPC per N utenti distinti.

---

### Architettura Proposta: "Batch Loading + Shimmer Skeletons"

```text
Feed Mount
    │
    ├───────────────────────────────────────────────────────────────┐
    │                       INSTANT (0ms)                            │
    │  ┌─────────────────────────────────────────────────────────┐  │
    │  │         FeedPostSkeleton (with shimmer)                 │  │
    │  │  ┌──────────────────────────────────────────────────┐   │  │
    │  │  │  Avatar skeleton + Username bar + Location bar   │   │  │
    │  │  │  ----------------------------------------         │   │  │
    │  │  │  Image placeholder with shimmer                  │   │  │
    │  │  │  ----------------------------------------         │   │  │
    │  │  │  Action buttons skeleton                         │   │  │
    │  │  └──────────────────────────────────────────────────┘   │  │
    │  └─────────────────────────────────────────────────────────┘  │
    └───────────────────────────────────────────────────────────────┘
    │
    ▼
useOptimizedFeed (React Query + localStorage cache)
    │
    ├── Posts loaded → Batch fetch engagement states
    │                  (likes, saves for ALL posts in 1 query each)
    │
    └── Render posts with blur-up images
```

---

### Modifiche Tecniche Dettagliate

#### 1. Creare `FeedPostSkeleton.tsx` con Shimmer Animation

**Nuovo file**: `src/components/feed/FeedPostSkeleton.tsx`

Un skeleton che simula esattamente la struttura di FeedPostItem:
- Header: Avatar circolare + due righe di testo (username + location)
- Media: Aspect-square con shimmer animato
- Actions: 4 bottoni con contatori
- Caption: 2 righe di testo

```text
+------------------------------------------+
|  (O)  Username skeleton                  |
|       Location skeleton                  |
+------------------------------------------+
|                                          |
|        [shimmer effect over              |
|         aspect-square area]              |
|                                          |
+------------------------------------------+
|  ♥ 0   💬 0   ↗ 0            📌         |
+------------------------------------------+
|  ████████████████████████████████████    |
|  ██████████████████                      |
+------------------------------------------+
```

#### 2. Progressive Image Loading in FeedPostItem

**File**: `src/components/feed/FeedPostItem.tsx`

Aggiungere blur-up effect alle immagini dei post, identico a VirtualizedPostGrid:

```typescript
const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});

// Nel render dell'immagine:
<img
  src={url}
  className={cn(
    "w-full h-full object-cover transition-all duration-300",
    imageLoaded[idx] ? "opacity-100 blur-0" : "opacity-0 blur-sm"
  )}
  loading="lazy"
  decoding="async"
  onLoad={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
/>
// Placeholder visibile finche l'immagine non e caricata
{!imageLoaded[idx] && (
  <div className="absolute inset-0 bg-muted shimmer-skeleton" />
)}
```

#### 3. Batch Fetch Engagement States

**Nuovo file**: `src/hooks/useBatchEngagementStates.ts`

Hook che carica lo stato di engagement per tutti i post del feed in batch:

```typescript
export const useBatchEngagementStates = (postIds: string[], locationIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['batch-engagement', user?.id, postIds.join(',')],
    queryFn: async () => {
      if (!user?.id || postIds.length === 0) return { likes: new Map(), saves: new Map() };

      // 1 query per tutti i likes dell'utente sui post del feed
      const { data: userLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      // 1 query per tutti i saves dell'utente sulle locations del feed
      const validLocationIds = locationIds.filter(Boolean);
      const { data: userSaves } = validLocationIds.length > 0 
        ? await supabase
            .from('user_saved_locations')
            .select('location_id, save_tag')
            .eq('user_id', user.id)
            .in('location_id', validLocationIds)
        : { data: [] };

      const likesSet = new Set((userLikes || []).map(l => l.post_id));
      const savesMap = new Map((userSaves || []).map(s => [s.location_id, s.save_tag]));

      return { likes: likesSet, saves: savesMap };
    },
    enabled: !!user?.id && postIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};
```

#### 4. Ottimizzare PostActions per Usare States Pre-Caricati

**File**: `src/components/feed/PostActions.tsx`

Modificare per accettare `initialSaveState` e `initialLikeState` come props invece di fare query:

```typescript
interface PostActionsProps {
  postId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  locationId?: string;
  locationName?: string;
  // NEW: Pre-loaded states from batch fetch
  initialIsLiked?: boolean;
  initialSaveTag?: SaveTag | null;
  onCommentClick: () => void;
  onShareClick: () => void;
}

// Rimuovere useEffect che fa query individuali se abbiamo initialSaveTag
useEffect(() => {
  if (initialSaveTag !== undefined) {
    setIsLocationSaved(!!initialSaveTag);
    if (initialSaveTag) setCurrentSaveTag(initialSaveTag);
    return; // Skip individual queries
  }
  // Fallback a query individuali solo se non abbiamo dati pre-caricati
  ...
}, [locationId, user, initialSaveTag]);
```

#### 5. Ottimizzare useVisitedSaves con Privacy Batch

**File**: `src/hooks/useVisitedSaves.ts`

Invece di N query RPC per privacy, usare una singola query:

```typescript
// PRIMA: N query
const privacyChecks = await Promise.all(
  userIds.map(async (targetUserId) => {
    const { data: canView } = await supabase.rpc('can_view_been_cards', {...});
    return { userId: targetUserId, canView };
  })
);

// DOPO: 1 query RPC che accetta array
// Oppure: fetch tutti i privacy settings e filtrare client-side
const { data: privacySettings } = await supabase
  .from('profiles')
  .select('id, been_cards_visibility')
  .in('id', userIds);

const viewableUserIds = new Set(
  (privacySettings || [])
    .filter(p => canViewBasedOnSetting(p.been_cards_visibility, followingSet.has(p.id)))
    .map(p => p.id)
);
```

#### 6. Virtualize Feed per Scalabilita

**File**: `src/pages/FeedPage.tsx`

Per supportare 20k+ utenti e feed lunghi, implementare virtualizzazione:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: mergedFeed.length,
  getScrollElement: () => scrollContainerRef.current,
  estimateSize: () => 500, // Altezza stimata di un post
  overscan: 3,
});

// Render solo elementi visibili
{rowVirtualizer.getVirtualItems().map((virtualItem) => {
  const entry = mergedFeed[virtualItem.index];
  // render post or visited card
})}
```

#### 7. Update FeedPage Loading State

**File**: `src/pages/FeedPage.tsx`

Sostituire skeleton basico con FeedPostSkeleton:

```typescript
import FeedPostSkeleton from '@/components/feed/FeedPostSkeleton';

{loading ? (
  <div className="space-y-0 bg-background">
    <FeedPostSkeleton />
    <FeedPostSkeleton />
    <FeedPostSkeleton />
  </div>
) : ...}
```

---

### File da Modificare

| File | Tipo Modifica |
|------|--------------|
| `src/components/feed/FeedPostSkeleton.tsx` | **Nuovo** - Skeleton con shimmer |
| `src/hooks/useBatchEngagementStates.ts` | **Nuovo** - Batch fetch engagement |
| `src/components/feed/FeedPostItem.tsx` | Progressive image loading |
| `src/components/feed/PostActions.tsx` | Accettare pre-loaded states |
| `src/hooks/useVisitedSaves.ts` | Ottimizzare privacy checks |
| `src/pages/FeedPage.tsx` | Usare nuovo skeleton + batch hook |
| `src/components/feed/UserVisitedCard.tsx` | Accettare pre-loaded states |

---

### Risultato Atteso

| Metrica | Prima | Dopo | Miglioramento |
|---------|-------|------|---------------|
| Percezione First Paint | ~800ms (skeleton statico) | ~100ms (shimmer animato) | **-87%** |
| Query per post | 5-6 (like, save, comments, shares) | 0 (batch) | **-100%** |
| Query totali per 10 post | ~60 | ~5 | **-92%** |
| Image loading feel | Pop-in brusco | Blur-up fluido | **Smooth** |
| Memory usage (50+ posts) | Alto (tutti renderizzati) | Basso (virtualizzato) | **-80%** |

---

### Priorita Implementazione

1. **Quick Win** (20 min): `FeedPostSkeleton.tsx` - Shimmer visivo immediato
2. **Quick Win** (20 min): Progressive images in `FeedPostItem.tsx`
3. **High Impact** (30 min): `useBatchEngagementStates.ts` - Elimina N+1
4. **Medium** (20 min): Ottimizzare `PostActions.tsx` con pre-loaded states
5. **Medium** (20 min): Ottimizzare `useVisitedSaves.ts`
6. **Polish** (30 min): Feed virtualization per scalabilita
