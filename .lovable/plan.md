
## Piano: Ottimizzazione Profile Page per 20k+ Utenti Concorrenti

### Analisi della Situazione Attuale

Ho analizzato l'architettura del profilo e identificato diversi colli di bottiglia che impattano i tempi di caricamento e la scalabilità.

---

### Problemi Identificati

#### 1. Cascata di Query al Caricamento (N+1 Problem)
La pagina profilo attiva **6+ hook separati** che fanno query indipendenti:
- `useOptimizedProfile` - Profilo utente
- `useOptimizedFollowStats` - Contatori followers/following
- `useOptimizedSavedPlaces` - Luoghi salvati
- `useUserSavedCities` - Città e conteggi categorie
- `useStories` - Stories utente
- `useUserBadges` - Badge e statistiche

**Impatto**: ~300-500ms di latenza cumulativa, 6 round-trip al database

#### 2. `useUserBadges` Non Usa React Query
Questo hook usa `useState/useEffect` tradizionale con query sequenziali:
- Fetch profilo
- Fetch saved locations
- Fetch unique cities
- Fetch posts con likes
- Fetch reviews count

**Impatto**: ~400ms, nessun caching, refetch completo ogni mount

#### 3. `useUserSavedCities` Fa Query Ridondanti
Quando visualizzi il tuo profilo vs profilo altri:
- Fetch `user_saved_locations` (duplicato con `useOptimizedSavedPlaces`)
- Fetch `saved_places` (duplicato)
- Se profilo altri: 4 query aggiuntive per "common locations"

**Impatto**: Query duplicate, 100-200ms sprecati

#### 4. ProfileHeader Carica Troppi Dati
```typescript
// ProfileHeader.tsx - Line 46-56
const { profile, refetch } = useOptimizedProfile();
const { cities, categoryCounts } = useUserSavedCities(user?.id);
const { stats } = useOptimizedFollowStats();
const { getStats } = useOptimizedSavedPlaces();
const { stories, refetch: refetchStories } = useStories();
```
Ogni hook ha il suo ciclo di loading, causando render multipli.

#### 5. PostsGrid Carica Tutto Subito
```typescript
// PostsGrid.tsx
const { posts: allPosts, loading } = useOptimizedPosts(targetUserId);
```
Carica TUTTI i post anche se l'utente guarda solo i primi 6.

---

### Architettura Proposta: "Single Query + Progressive Loading"

```text
                    ┌──────────────────────────────────┐
                    │     useProfileAggregated()       │
                    │   (Single consolidated query)    │
                    └──────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐           ┌───────────────┐           ┌─────────────────┐
│   Profile    │           │  Stats +      │           │   Category      │
│   + Avatar   │           │  Followers    │           │   Counts        │
└──────────────┘           └───────────────┘           └─────────────────┘
                                    
                    ┌──────────────────────────────────┐
                    │    Lazy Load (dopo 300ms)        │
                    └──────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐           ┌───────────────┐           ┌─────────────────┐
│    Posts     │           │    Stories    │           │     Badges      │
│  (first 12)  │           │  (if active)  │           │   (cached)      │
└──────────────┘           └───────────────┘           └─────────────────┘
```

---

### Modifiche Tecniche Dettagliate

#### 1. Creare `useProfileAggregated` Hook

**Nuovo file**: `src/hooks/useProfileAggregated.ts`

```typescript
// Query singola che aggrega profile + stats + category counts
export const useProfileAggregated = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['profile-aggregated', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      // PARALLEL: tutte le query critiche insieme
      const [
        profileRes,
        followersRes,
        followingRes,
        savedLocationsRes,
        savedPlacesRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', targetUserId).single(),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
        supabase.from('user_saved_locations').select('location_id, save_tag, locations(city)').eq('user_id', targetUserId),
        supabase.from('saved_places').select('id, city, save_tag').eq('user_id', targetUserId),
      ]);

      // Calcola category counts inline
      const categoryCounts = calculateCategoryCounts(savedLocationsRes.data, savedPlacesRes.data);

      return {
        profile: profileRes.data,
        stats: {
          followersCount: followersRes.count || 0,
          followingCount: followingRes.count || 0,
          postsCount: profileRes.data?.posts_count || 0,
          locationsCount: (savedLocationsRes.data?.length || 0) + (savedPlacesRes.data?.length || 0),
        },
        categoryCounts,
      };
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
```

**Beneficio**: 5-6 query → 1 query parallela (~100ms vs ~400ms)

#### 2. Convertire `useUserBadges` a React Query con Caching

**File**: `src/hooks/useUserBadges.ts`

```typescript
export const useUserBadges = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const { data: badgeData, isLoading } = useQuery({
    queryKey: ['user-badges', targetUserId],
    queryFn: async () => {
      // Fetch stats in parallel
      const [profileRes, savedRes, postsRes, reviewsRes] = await Promise.all([
        supabase.from('profiles').select('posts_count, follower_count, following_count').eq('id', targetUserId).single(),
        supabase.from('user_saved_locations').select('location_id, locations!inner(city)').eq('user_id', targetUserId),
        supabase.from('posts').select('id, likes_count').eq('user_id', targetUserId),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId).not('rating', 'is', null),
      ]);

      // Calculate badges...
      return { badges, userStats };
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // Badges non cambiano spesso
    gcTime: 30 * 60 * 1000,
  });

  return { badges: badgeData?.badges || [], loading: isLoading };
};
```

**Beneficio**: Cache automatico, no refetch inutili, ~200ms saved

#### 3. Lazy Load Tab Content

**File**: `src/components/ProfilePage.tsx`

```typescript
// Lazy load dei componenti tab
const PostsGrid = lazy(() => import('./profile/PostsGrid'));
const TripsGrid = lazy(() => import('./profile/TripsGrid'));
const Achievements = lazy(() => import('./profile/Achievements'));
const TaggedPostsGrid = lazy(() => import('./profile/TaggedPostsGrid'));

// Render con Suspense
const renderTabContent = () => {
  return (
    <Suspense fallback={<TabContentSkeleton />}>
      {activeTab === 'posts' && <PostsGrid />}
      {activeTab === 'trips' && <TripsGrid />}
      {activeTab === 'badges' && <Achievements userId={user?.id} />}
      {activeTab === 'tagged' && <TaggedPostsGrid />}
    </Suspense>
  );
};
```

**Beneficio**: Solo la tab attiva viene caricata, bundle splitting automatico

#### 4. Paginazione/Virtualizzazione PostsGrid

**File**: `src/components/profile/PostsGrid.tsx`

```typescript
// Usa infinite query per caricare progressivamente
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['posts', targetUserId, postFilter],
  queryFn: async ({ pageParam = 0 }) => {
    const from = pageParam * 12;
    const to = from + 11;
    
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    return data || [];
  },
  getNextPageParam: (lastPage, allPages) => 
    lastPage.length === 12 ? allPages.length : undefined,
  initialPageSize: 12,
});

// Virtualized grid con @tanstack/react-virtual
const rowVirtualizer = useVirtualizer({
  count: Math.ceil(allPosts.length / 2),
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 180,
  overscan: 3,
});
```

**Beneficio**: Carica solo 12 post iniziali invece di tutti, scroll infinito performante

#### 5. Prefetch Profilo da Altre Pagine

**File**: `src/components/NewBottomNavigation.tsx` (o simile)

```typescript
// Quando hover/focus sulla tab Profile, prefetch i dati
const handleProfileHover = () => {
  if (user?.id) {
    queryClient.prefetchQuery({
      queryKey: ['profile-aggregated', user.id],
      staleTime: 2 * 60 * 1000,
    });
  }
};
```

**Beneficio**: Dati già pronti quando l'utente clicca su Profile

#### 6. Ottimizzare ProfileHeader

**File**: `src/components/profile/ProfileHeader.tsx`

```typescript
// PRIMA: 5 hook separati
// DOPO: 1 hook aggregato + 1 per stories (lazy)

const { data, isLoading } = useProfileAggregated();
const { stories } = useStories(); // Solo se serve per avatar ring

// Render immediato con dati cached
if (isLoading && !data) return <ProfileHeaderSkeleton />;

// Usa data.profile, data.stats, data.categoryCounts direttamente
```

---

### Database Indexes Raccomandati

Per supportare 20k+ utenti, verificare questi indici:

```sql
-- Index composito per query follows frequenti
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);

-- Index per saved locations lookup
CREATE INDEX IF NOT EXISTS idx_user_saved_locations_user_id ON user_saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);

-- Index per posts lookup
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
```

---

### Risultato Atteso

| Metrica | Prima | Dopo | Miglioramento |
|---------|-------|------|---------------|
| Tempo First Paint | ~800ms | ~200ms | **-75%** |
| Query Database | 6-8 | 1-2 | **-80%** |
| Time to Interactive | ~1.2s | ~400ms | **-67%** |
| Bundle size (Profile) | ~120KB | ~40KB | **-67%** |
| Concurrent user capacity | ~5k | 20k+ | **+300%** |

---

### File da Modificare

| File | Tipo Modifica |
|------|--------------|
| `src/hooks/useProfileAggregated.ts` | **Nuovo** - Hook consolidato |
| `src/hooks/useUserBadges.ts` | Convertire a React Query |
| `src/components/ProfilePage.tsx` | Lazy loading tabs, usare hook aggregato |
| `src/components/profile/ProfileHeader.tsx` | Semplificare, usare hook aggregato |
| `src/components/profile/PostsGrid.tsx` | Infinite query + virtualizzazione |
| `src/hooks/useOptimizedPosts.ts` | Aggiungere paginazione |

---

### Priorità Implementazione

1. **Quick Win** (30 min): Creare `useProfileAggregated` e usarlo in ProfileHeader
2. **Medium** (1 ora): Convertire `useUserBadges` a React Query
3. **High Impact** (2 ore): Lazy load tabs + PostsGrid virtualizzato
4. **Polish** (30 min): Prefetch da navigation + skeleton improvements

