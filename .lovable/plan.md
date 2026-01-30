
# Piano: Ottimizzazione Performance Pagina Profilo

## Problemi Identificati

### 1. BUG CRITICO: Infinite Loop nel Carousel
I log mostrano `Maximum update depth exceeded` causato da `setApi` nel carousel di `PostDetailModalMobile.tsx`. Quando il carousel chiama `setApi(api)`, questo causa un re-render che ricrea l'api, innescando un loop infinito.

### 2. Settings Button Appare in Ritardo
Il pulsante settings e' dentro `ProfileHeader` che mostra `ProfileHeaderSkeleton` quando `loading && !profile`. Il settings button dovrebbe essere sempre visibile, indipendentemente dallo stato di loading.

### 3. Query Duplicate
- `ProfilePage.tsx` chiama `useProfileAggregated()`
- `ProfileHeader.tsx` chiama di nuovo `useProfileAggregated()` separatamente
- `PostsGrid.tsx` chiama `useOptimizedProfile()` (terza query profilo!)
- `BadgeDisplay` chiama `useUserBadges()` (quarta query parallela!)

### 4. useStories Sempre Attivo
Il hook `useStories` viene chiamato sempre in `ProfileHeader` anche se serve solo per l'avatar ring. E' un fetch non necessario per la maggior parte degli utenti.

---

## Soluzioni Proposte

### Fix 1: Risolvere Infinite Loop Carousel

Modificare `PostDetailModalMobile.tsx` per usare un ref stabile invece di state per il carousel API:

```tsx
// Prima (causa loop)
const [carouselApis, setCarouselApis] = useState<Record<string, any>>({});

// Dopo (stabile)
const carouselApisRef = useRef<Record<string, any>>({});
```

### Fix 2: Settings Button Sempre Visibile

Estrarre il settings button fuori dalla logica condizionale del `ProfileHeader`. Renderizzarlo sempre nella parte destra, indipendentemente dallo stato di loading:

```tsx
// ProfileHeader.tsx
const ProfileHeader = ({ ... }) => {
  // ... hooks ...

  // Settings button SEMPRE visibile
  const SettingsButton = (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-10 w-10 p-0"
      onClick={() => navigate('/settings')}
    >
      <img src={settingsIcon} alt="Settings" className="w-9 h-9" />
    </Button>
  );

  if (loading && !profile) {
    return (
      <div className="pt-1 pb-2 bg-background">
        <div className="flex items-start gap-3 px-3">
          {/* Skeleton content */}
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1">...</div>
          {/* Settings sempre visibile anche durante loading */}
          <div className="shrink-0">{SettingsButton}</div>
        </div>
      </div>
    );
  }
  // ...
};
```

### Fix 3: Eliminare Query Duplicate

Passare i dati del profilo come props invece di ri-fetchare:

```tsx
// ProfilePage.tsx
const { profile, stats, categoryCounts, loading } = useProfileAggregated();

<ProfileHeader
  profile={profile}
  stats={stats}
  categoryCounts={categoryCounts}
  loading={loading}
  // ...altri props
/>
```

Rimuovere `useProfileAggregated()` e `useOptimizedProfile()` dai componenti figli.

### Fix 4: Lazy Load Stories

Caricare le stories solo se l'utente ha un avatar cliccabile:

```tsx
// Solo fetch stories quando necessario
const { stories } = useStories({ 
  enabled: !!profile?.avatar_url 
});
```

### Fix 5: Consolidare Badge Query

Spostare `useUserBadges` nel `ProfilePage` e passare i badge come props a `BadgeDisplay`:

```tsx
// ProfilePage.tsx
const { badges } = useUserBadges(user?.id);

<ProfileHeader badges={badges} />
```

---

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `PostDetailModalMobile.tsx` | Fix infinite loop carousel con useRef |
| `ProfileHeader.tsx` | Settings button sempre montato, props invece di hooks |
| `ProfilePage.tsx` | Passare profile/badges come props ai figli |
| `ProfileHeaderSkeleton.tsx` | Mostrare settings button reale invece di skeleton |
| `PostsGrid.tsx` | Rimuovere useOptimizedProfile, ricevere userId come prop |
| `BadgeDisplay.tsx` | Ricevere badges come prop invece di useUserBadges |

---

## Impatto Atteso

| Metrica | Prima | Dopo |
|---------|-------|------|
| Query Supabase all'apertura | 8-10 | 2-3 |
| Tempo caricamento header | ~600ms | ~150ms |
| Settings button visibile | Dopo 500ms+ | Istantaneo |
| Console errors | "Maximum update depth" | Nessuno |
| Re-render componenti | 4-5 per cambio stato | 1-2 |

---

## Dettagli Tecnici

### Infinite Loop Fix
Il problema e' che `setApi(api)` viene chiamato in un `useEffect` del carousel, ma `setApi` e' una nuova funzione ad ogni render (perche' viene da `useState`). Usando `useRef` per memorizzare gli api objects, evitiamo i re-render e il loop.

### Props Drilling vs Context
Per questa ottimizzazione uso props drilling perche':
1. I dati fluiscono in una sola direzione (ProfilePage -> Header -> Badge)
2. Non ci sono componenti deeply nested
3. E' piu' esplicito e debuggabile

### Caching React Query
Le query gia' usano `staleTime` e `gcTime` appropriati. Il problema non e' il caching ma il numero di query duplicate che partono in parallelo.
