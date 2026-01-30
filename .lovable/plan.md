

# Piano: Ottimizzazione Performance Followers/Following e Feed

## Analisi Bottlenecks Attuali

### 1. Followers/Following Modal - Problemi Identificati

**Fetching sequenziale con molteplici round-trips:**
- Prima query: Carica followers/following da `follows`
- Seconda query: Carica `saved_places` per tutti gli utenti
- Terza query: Carica `user_saved_locations` per tutti gli utenti
- Quarta query: Verifica `isFollowing` per l'utente corrente

**Nessun caching tra tab switch:**
- Il cache locale (`followersCache`, `followingCache`) viene invalidato ad ogni apertura del modal
- `useMutualFollowers` non usa React Query, quindi ricarica ogni volta

### 2. Feed Page - Problemi Identificati

**`useVisitedSaves` esegue troppe query:**
- Prima: Carica `follows`
- Seconda: Carica `user_saved_locations` con join a `locations`
- Terza: Privacy checks individuali via RPC (fino a 10 chiamate!)
- Quarta: Carica tutti i `posts` per filtrare duplicati
- Quinta: Carica tutti i `profiles`

**Query non ottimali:**
- `useOptimizedFeed` ricarica sempre al mount (`refetchOnMount: 'always'`)
- `useBatchEngagementStates` usa una query key troppo granulare che cambia ad ogni render

---

## Soluzioni Proposte

### 1. Migrare FollowersModal a React Query

Convertire il fetching da `useState`/`useEffect` a `useQuery` per:
- Cache automatico tra aperture del modal
- Deduplicazione richieste concurrent
- Skeleton UI mentre dati cached vengono refreshati in background

```tsx
// Nuovo hook dedicato
const useFollowersData = (userId: string, tab: 'followers' | 'following', enabled: boolean) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['follow-list', userId, tab],
    queryFn: async () => {
      // Query parallelizzate con Promise.all
      const [followData, savedPlacesCounts, followingStatus] = await Promise.all([
        fetchFollowList(userId, tab),
        fetchSavedPlacesCounts(userIds),
        user ? fetchFollowingStatus(user.id, userIds) : null,
      ]);
      return mergeData(followData, savedPlacesCounts, followingStatus);
    },
    enabled,
    staleTime: 60 * 1000, // 1 minuto - dati cached immediati
    gcTime: 5 * 60 * 1000, // 5 minuti in memoria
  });
};
```

### 2. Ottimizzare useMutualFollowers con React Query

Convertire da useState/useEffect a useQuery:

```tsx
export const useMutualFollowers = (viewedUserId?: string, fetchAll = false) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mutual-followers', viewedUserId, user?.id, fetchAll],
    queryFn: async () => {
      // Logica esistente...
    },
    enabled: !!viewedUserId && !!user && user.id !== viewedUserId,
    staleTime: 2 * 60 * 1000, // Cache per 2 minuti
  });
};
```

### 3. Skeleton UI per Loading States

Invece dello spinner generico, mostrare grid di skeleton cards:

```tsx
const UserGridSkeleton = () => (
  <div className="grid grid-cols-3 gap-0 px-1">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1.5 py-2 px-1">
        <div className="w-[76px] h-[76px] rounded-[20px] bg-muted shimmer-skeleton" />
        <div className="w-16 h-3 bg-muted rounded shimmer-skeleton" />
      </div>
    ))}
  </div>
);
```

### 4. Ottimizzare useVisitedSaves

Ridurre le query consolidando i dati:

```tsx
// Prima: 5+ queries sequenziali
// Dopo: 2-3 queries parallelizzate

const { data: visitedSaves } = useQuery({
  queryKey: ['visited-saves', user?.id, userCity],
  queryFn: async () => {
    // Query 1: following IDs (gia in cache dalla home page)
    const followingIds = await getFollowingIds(user.id);
    
    // Query 2: visited saves solo da utenti seguiti (skip privacy checks!)
    const saves = await supabase
      .from('user_saved_locations')
      .select(`*, locations(*), profiles:user_id(id, username, avatar_url)`)
      .eq('save_tag', 'been')
      .in('user_id', followingIds) // Solo seguiti = skip privacy RPC
      .order('created_at', { ascending: false })
      .limit(30);
    
    // Query 3: posts per deduplicazione (parallelizzata)
    // ...
  },
  staleTime: 3 * 60 * 1000,
});
```

### 5. Ottimizzare Feed Page QueryFn

Rimuovere `refetchOnMount: 'always'` e usare staleTime piu lungo:

```tsx
// Prima
refetchOnMount: 'always',
staleTime: 1 * 60 * 1000,

// Dopo  
refetchOnMount: false,  // Usa cache se disponibile
staleTime: 3 * 60 * 1000, // 3 minuti - mostra cached subito
refetchOnWindowFocus: false,
```

### 6. Pre-caricare Followers al Click sul Counter

Quando l'utente clicca sul numero di followers/following, pre-fetch i dati:

```tsx
// In ProfilePage.tsx o UserProfilePage.tsx
const handleFollowersClick = () => {
  // Pre-fetch prima di aprire il modal
  queryClient.prefetchQuery({
    queryKey: ['follow-list', userId, 'followers'],
    staleTime: 60 * 1000,
  });
  setShowFollowersModal(true);
};
```

---

## Impatto Atteso

| Componente | Prima | Dopo |
|------------|-------|------|
| **Followers Modal** | ~1.5s loading (4 queries sequenziali) | ~0ms se cached, ~400ms se fresh |
| **Tab Switch** | ~800ms (ricarica tutto) | ~0ms (cache locale) |
| **Mutual Followers** | ~600ms (sempre fresh) | ~0ms se cached |
| **Feed Page** | ~1.2s (visited cards lente) | ~300ms (query parallele, no RPC) |
| **Feed Refresh** | ~1.2s (sempre refetch) | ~0ms se < 3min (usa cache) |

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/components/profile/FollowersModal.tsx` | Usare `useQuery` invece di `useState`/`useEffect`, skeleton UI |
| `src/hooks/useMutualFollowers.ts` | Convertire a `useQuery` con caching |
| `src/hooks/useVisitedSaves.ts` | Semplificare query, rimuovere privacy RPC per followed users |
| `src/hooks/useOptimizedFeed.ts` | Rimuovere `refetchOnMount: 'always'`, aumentare staleTime |
| `src/hooks/useFollowList.ts` | **NUOVO** - Hook dedicato con React Query per followers/following |

---

## Dettagli Tecnici

### Nuovo Hook: useFollowList

```tsx
// src/hooks/useFollowList.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FollowUser {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing: boolean;
  savedPlacesCount: number;
}

export const useFollowList = (
  userId: string | undefined,
  type: 'followers' | 'following',
  enabled: boolean = true
) => {
  const { user: currentUser } = useAuth();

  return useQuery<FollowUser[]>({
    queryKey: ['follow-list', userId, type],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Fetch base follow data
      const column = type === 'followers' ? 'follower_id' : 'following_id';
      const fkRef = type === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey';
      
      const { data: followData } = await supabase
        .from('follows')
        .select(`${column}, profiles!${fkRef}(id, username, avatar_url)`)
        .eq(type === 'followers' ? 'following_id' : 'follower_id', userId);

      const users = (followData || []).map((f: any) => f.profiles).filter(Boolean);
      if (users.length === 0) return [];

      const userIds = users.map((u: any) => u.id);

      // 2. Parallel fetch: saved places counts + following status
      const [savedPlaces, userSavedLocs, followingStatus] = await Promise.all([
        supabase.from('saved_places').select('user_id').in('user_id', userIds),
        supabase.from('user_saved_locations').select('user_id').in('user_id', userIds),
        currentUser 
          ? supabase.from('follows').select('following_id').eq('follower_id', currentUser.id).in('following_id', userIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Count saved places
      const savedCounts = new Map<string, number>();
      [...(savedPlaces.data || []), ...(userSavedLocs.data || [])].forEach((s: any) => {
        savedCounts.set(s.user_id, (savedCounts.get(s.user_id) || 0) + 1);
      });

      // Following status set
      const followingSet = new Set((followingStatus.data || []).map((f: any) => f.following_id));

      return users.map((u: any) => ({
        id: u.id,
        username: u.username || 'User',
        avatar_url: u.avatar_url,
        isFollowing: followingSet.has(u.id),
        savedPlacesCount: savedCounts.get(u.id) || 0,
      }));
    },
    enabled: enabled && !!userId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
```

### FollowersModal Skeleton

Il modal mostrera immediatamente uno skeleton grid mentre i dati vengono caricati, invece di un semplice spinner centrato. Questo da feedback visivo istantaneo.

### Query Key Stability

Per `useBatchEngagementStates`, la query key attuale include tutti i post IDs come stringa, causando re-fetch ad ogni cambio. Usare invece un hash o limitare la granularita.

