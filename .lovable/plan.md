

# Piano: Ottimizzazione Performance Lista Home + Miglioramenti UX Premium

## Problema Identificato

La lista "Posizioni" nella home page è **lenta ad aprirsi** per due motivi principali:

### 1. Pattern N+1 Query (CRITICO)
Ogni `LocationListItem` chiama `useLocationStats()` che esegue **fino a 6 query Supabase per item**:
- Query 1: Count saves da `saved_places`
- Query 2: Count saves da `user_saved_locations`
- Query 3: Fetch ratings da `interactions`
- Query 4: Fetch ratings da `posts`
- Query 5-6: Fallback per Google Place ratings

**Impatto**: Con 20 locations = **120+ query Supabase** al momento dell'apertura del drawer

### 2. Animazione Drawer Non Ottimizzata
- Il drawer usa `backdrop-blur-xl` che è computazionalmente pesante
- L'altezza dinamica viene ricalcolata ad ogni render
- Nessun pre-rendering del contenuto

---

## Soluzione Tecnica

### Fase 1: Batch Loading delle Stats (Alta Priorità)

**File**: `src/hooks/useBatchedLocationStats.ts` (nuovo)

Creare un hook che carica le stats per tutte le locations in **2 query batch** invece di N*6:

```typescript
export const useBatchedLocationStats = (locations: Place[]) => {
  // Batch query 1: Tutti i saves
  // Batch query 2: Tutti i ratings
  // Ritorna Map<locationId, stats>
};
```

**File**: `src/components/home/MapSection.tsx`

Modificare per:
1. Chiamare `useBatchedLocationStats(places)` una sola volta
2. Passare le stats pre-caricate a ogni `LocationListItem`
3. Rimuovere `useLocationStats` da `LocationListItem`

### Fase 2: Ottimizzazione Drawer Animation

**File**: `src/components/home/MapSection.tsx` (linee 637-644)

Miglioramenti:
1. Usare `will-change: transform` per hint GPU
2. Ridurre `backdrop-blur-xl` a `backdrop-blur-md` per performance
3. Pre-calcolare l'altezza e cachearla
4. Aggiungere `transform: translateZ(0)` per layer compositing

```tsx
<DrawerContent 
  showHandle={false}
  hideOverlay={true}
  className="flex flex-col z-[150] backdrop-blur-md border-t border-border/10 shadow-2xl overflow-hidden will-change-transform"
  style={{
    transform: 'translateZ(0)', // Force GPU layer
    height: drawerHeight, // Pre-calculated
  }}
>
```

### Fase 3: Skeleton Loading Migliorato

**File**: `src/components/home/LocationListItem.tsx`

Aggiungere shimmer animation durante il caricamento delle stats:

```tsx
{statsLoading ? (
  <div className="flex items-center gap-1.5 animate-pulse">
    <Skeleton className="w-8 h-4 rounded-full" />
    <Skeleton className="w-6 h-4 rounded-full" />
  </div>
) : (
  // Stats content
)}
```

### Fase 4: UX Premium Improvements

**1. Transizione Apertura Fluida**

Aggiungere animazione CSS più fluida:

```css
/* In index.css */
@keyframes drawer-slide-up {
  from { 
    transform: translateY(100%);
    opacity: 0.5;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

.drawer-premium {
  animation: drawer-slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
```

**2. Haptic Feedback Migliorato**

Aggiungere feedback tattile all'apertura del drawer:

```tsx
onClick={() => {
  haptics.impact('medium'); // Upgrade da 'light' a 'medium'
  previousOverlayRef.current = 'list';
  setOverlay('list');
}}
```

**3. List Item Touch Feedback**

Migliorare il feedback al tap sugli item:

```tsx
// LocationListItem.tsx
className="... active:scale-[0.98] active:bg-muted/40 transition-all duration-150"
```

**4. Pull-to-Refresh Visual**

Aggiungere indicatore di refresh nella lista:

```tsx
<ScrollArea 
  className="..."
  onScroll={(e) => {
    // Detect overscroll for pull-to-refresh visual
  }}
>
```

**5. Empty State Migliorato**

Animazione per lo stato vuoto:

```tsx
<LocationListEmpty className="animate-fade-in-up" />
```

---

## Dettagli Implementazione

### File da Creare

| File | Descrizione |
|------|-------------|
| `src/hooks/useBatchedLocationStats.ts` | Hook per batch loading stats |

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/home/MapSection.tsx` | Integrare batch stats, ottimizzare drawer |
| `src/components/home/LocationListItem.tsx` | Ricevere stats come prop, migliorare touch feedback |
| `src/index.css` | Aggiungere animazione drawer-slide-up |
| `tailwind.config.ts` | Eventuale nuova animation keyframe |

---

## Implementazione `useBatchedLocationStats.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/place';

interface LocationStats {
  totalSaves: number;
  averageRating: number | null;
}

export const useBatchedLocationStats = (places: Place[]) => {
  const [statsMap, setStatsMap] = useState<Map<string, LocationStats>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (places.length === 0) {
      setStatsMap(new Map());
      return;
    }

    const fetchBatchedStats = async () => {
      setLoading(true);
      const newStatsMap = new Map<string, LocationStats>();

      try {
        // Collect all IDs
        const locationIds = places.map(p => p.id).filter(Boolean);
        const googlePlaceIds = places.map(p => p.google_place_id).filter(Boolean) as string[];

        // Batch query 1: Saves count from user_saved_locations
        const { data: internalSaves } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .in('location_id', locationIds);

        // Batch query 2: Saves count from saved_places
        const { data: googleSaves } = googlePlaceIds.length > 0 
          ? await supabase
              .from('saved_places')
              .select('place_id')
              .in('place_id', googlePlaceIds)
          : { data: [] };

        // Batch query 3: Ratings from posts
        const { data: postRatings } = await supabase
          .from('posts')
          .select('location_id, rating')
          .in('location_id', locationIds)
          .not('rating', 'is', null)
          .gt('rating', 0);

        // Count saves per location
        const savesCount = new Map<string, number>();
        internalSaves?.forEach(s => {
          savesCount.set(s.location_id, (savesCount.get(s.location_id) || 0) + 1);
        });
        googleSaves?.forEach(s => {
          savesCount.set(s.place_id, (savesCount.get(s.place_id) || 0) + 1);
        });

        // Calculate average ratings
        const ratingsPerLocation = new Map<string, number[]>();
        postRatings?.forEach(p => {
          if (!ratingsPerLocation.has(p.location_id)) {
            ratingsPerLocation.set(p.location_id, []);
          }
          ratingsPerLocation.get(p.location_id)!.push(p.rating);
        });

        // Build final stats map
        places.forEach(place => {
          const key = place.id;
          const totalSaves = (savesCount.get(place.id) || 0) + 
                            (place.google_place_id ? savesCount.get(place.google_place_id) || 0 : 0);
          
          const ratings = ratingsPerLocation.get(place.id) || [];
          const averageRating = ratings.length > 0 
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null;

          newStatsMap.set(key, { totalSaves, averageRating });
        });

        setStatsMap(newStatsMap);
      } catch (error) {
        console.error('Error fetching batched stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchedStats();
  }, [places.map(p => p.id).join(',')]);

  return { statsMap, loading };
};
```

---

## Performance Target

| Metrica | Prima | Dopo |
|---------|-------|------|
| Query Supabase (20 items) | 120+ | 3-4 |
| Tempo apertura drawer | 800-1200ms | 150-300ms |
| Frame rate durante animazione | 30-45 FPS | 60 FPS |
| First Contentful Paint | 600ms | 200ms |

---

## Ordine di Implementazione

1. **Creare** `useBatchedLocationStats.ts` - Hook batch loading
2. **Modificare** `MapSection.tsx` - Integrare batch stats e ottimizzare drawer
3. **Modificare** `LocationListItem.tsx` - Ricevere stats come prop, touch feedback
4. **Aggiungere** CSS animations in `index.css`
5. **Test** - Verificare fluidità su dispositivo mobile

Queste modifiche ridurranno drasticamente il tempo di apertura del drawer e renderanno l'esperienza molto più fluida e premium.

