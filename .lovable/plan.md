

# Piano: Fix "0" nella Lista + Ultra-Ottimizzazione Performance

## 🐛 Problema 1: Lo "0" Visualizzato

Guardando lo screenshot, c'è un grande **"0"** mostrato a destra di ogni location. Questo è il campo `place.likes` che viene impostato a `0` in MapSection (linea 377):

```tsx
likes: 0, // Hardcoded
```

Il codice attuale di `LocationListItem.tsx` **non dovrebbe mostrare questo "0"** secondo la logica delle condizioni (linee 120, 133):
```tsx
{stats?.averageRating && stats.averageRating > 0 && (...)}
{stats?.totalSaves && stats.totalSaves > 0 && (...)}
```

**Possibili cause:**
1. Build non aggiornata / caching del browser
2. La versione deployed non ha l'ultima modifica
3. Bug nel passaggio delle stats

**Fix:** Verificare che la build sia corretta. Se il problema persiste, modifico la condizione per essere più esplicita e rimuovo qualsiasi riferimento a `place.likes` che potrebbe essere visualizzato.

---

## 🚀 Problema 2: Lentezza Apertura Drawer

### Cause Identificate dai Console Logs:
```
Reverse geocoding failed: TypeError: Failed to fetch
```
Ci sono **multiple chiamate di reverse geocoding** che falliscono e bloccano l'UI!

### Fix: Ottimizzazione Address Enrichment

**File**: `src/components/home/MapSection.tsx` (linee 398-427)

Attualmente `enrichMissingAddresses` viene chiamato in modo sincrono per ogni place che manca di indirizzo, causando:
- Multiple chiamate Nominatim che falliscono
- Blocco del thread principale
- Ritardo nell'apertura del drawer

**Soluzione:**
1. **Lazy Loading**: Non caricare gli indirizzi immediatamente, ma solo quando l'utente scrolla
2. **Batch con limite**: Limitare a 3-5 chiamate parallele max
3. **Skip se offline/failed**: Se una chiamata fallisce, skip per quella sessione
4. **Remove dal critical path**: Spostare l'enrichment dopo che il drawer è già visibile

```tsx
// BEFORE: Chiamate immediate bloccanti
useEffect(() => {
  if (isListViewOpen && places.length > 0) {
    enrichMissingAddresses(); // Blocca tutto!
  }
}, [isListViewOpen, places]);

// AFTER: Lazy, non-blocking, con timeout
useEffect(() => {
  if (!isListViewOpen || places.length === 0) return;
  
  // Delay enrichment - render drawer FIRST
  const timer = setTimeout(() => {
    enrichMissingAddressesLazy();
  }, 500); // 500ms dopo apertura drawer
  
  return () => clearTimeout(timer);
}, [isListViewOpen, places.length]);
```

---

## 🚀 Problema 3: Velocizzare Apertura PinDetailCard dalla Lista

### Analisi Attuale:
Quando si clicca un item nella lista, il flow è:
1. `setOverlay('pin')` - chiude drawer
2. `handlePinClick(place)` - setta selectedPlace
3. PinDetailCard si monta e inizia a caricare dati

### Colli di Bottiglia in PinDetailCard:
- **~2000 linee** di codice complesso
- Multipli `useEffect` che partono in sequenza
- Fetch separati per: posts, reviews, photos, hours, engagement, campaign, saved status
- Nessun pre-loading dei dati

### Ottimizzazioni:

#### A. Pre-fetch durante Hover/Touch sulla Lista

**File**: `src/components/home/LocationListItem.tsx`

Aggiungere pre-fetch quando l'utente tocca/hover su un item PRIMA del click:

```tsx
// Pre-warm cache on touch start
const handleTouchStart = () => {
  // Pre-fetch engagement data
  prefetchPinEngagement(place.id, place.google_place_id);
};

<div onTouchStart={handleTouchStart} onClick={...}>
```

#### B. Passare Dati Già Caricati al PinDetailCard

**File**: `src/components/home/MapSection.tsx`

Passare le stats già caricate via prop invece di farle ricaricare:

```tsx
<PinDetailCard
  place={selectedPlace}
  preloadedStats={statsMap.get(selectedPlace?.id)} // Evita refetch!
  ...
/>
```

#### C. Ottimizzare PinDetailCard Mount

**File**: `src/components/explore/PinDetailCard.tsx`

1. **Skeleton immediato**: Mostrare skeleton mentre carica (già fatto parzialmente)
2. **Parallelizzare queries**: Usare `Promise.all` per fetch simultanei
3. **Skip fetch se dati presenti**: Se `preloadedStats` è passato, usalo

---

## 📊 Riepilogo Modifiche

| File | Modifica | Impatto |
|------|----------|---------|
| `src/components/home/LocationListItem.tsx` | Condizione stats più robusta, pre-fetch on touch | 🟡 Medium |
| `src/components/home/MapSection.tsx` | Lazy address enrichment con delay 500ms | 🟢 High |
| `src/components/home/MapSection.tsx` | Passare preloadedStats a PinDetailCard | 🟡 Medium |
| `src/hooks/useBatchedLocationStats.ts` | Aggiungere cache stabile tra remount | 🟢 High |
| `src/components/explore/PinDetailCard.tsx` | Usare preloadedStats se disponibili | 🟡 Medium |

---

## Dettagli Implementazione

### 1. LocationListItem - Condizione Stats Robusta

```tsx
// Linea 133 - Attuale:
{stats?.totalSaves && stats.totalSaves > 0 && (

// Fix - più esplicito:
{typeof stats?.totalSaves === 'number' && stats.totalSaves > 0 && (
```

### 2. MapSection - Lazy Address Enrichment

```tsx
// Linee 398-427 - Sostituire con:
useEffect(() => {
  if (!isListViewOpen || places.length === 0) return;
  
  // Non bloccare apertura drawer - enrichment asincrono dopo 500ms
  const timer = setTimeout(() => {
    const placesNeedingAddress = places
      .filter(place => !place.address && place.coordinates?.lat && !enrichedAddresses[place.id])
      .slice(0, 5); // Max 5 alla volta
    
    // Non-blocking, skip su errore
    placesNeedingAddress.forEach(async (place) => {
      try {
        const formattedAddress = await formatDetailedAddress({
          city: place.city,
          address: place.address,
          coordinates: place.coordinates
        });
        
        if (formattedAddress && formattedAddress !== 'Indirizzo non disponibile') {
          setEnrichedAddresses(prev => ({ ...prev, [place.id]: formattedAddress }));
        }
      } catch {
        // Silently skip - non bloccare UI
      }
    });
  }, 500);
  
  return () => clearTimeout(timer);
}, [isListViewOpen, places.length]);
```

### 3. useBatchedLocationStats - Cache Module-Level

```tsx
// Aggiungere cache a livello di modulo per persistere tra remount:
const statsCache = new Map<string, { stats: Map<string, LocationStats>; timestamp: number }>();
const STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 minuti

export const useBatchedLocationStats = (places: Place[]) => {
  // Check cache BEFORE fetch
  const cacheKey = places.map(p => p.id).sort().join(',');
  const cached = statsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < STATS_CACHE_DURATION) {
    return { statsMap: cached.stats, loading: false };
  }
  
  // ... existing fetch logic ...
  
  // After fetch, cache result
  statsCache.set(cacheKey, { stats: newStatsMap, timestamp: Date.now() });
};
```

### 4. PinDetailCard - Accept Preloaded Stats

```tsx
// Aggiungere prop:
interface PinDetailCardProps {
  place: any;
  onClose: () => void;
  onPostSelected?: (postId: string) => void;
  onBack?: () => void;
  preloadedStats?: LocationStats; // NEW
}

// Nel componente, usare se disponibile:
const { stats: fetchedStats } = useLocationStats(
  preloadedStats ? null : place.id, // Skip fetch se preloaded
  preloadedStats ? null : place.google_place_id
);
const stats = preloadedStats || fetchedStats;
```

---

## Performance Target

| Metrica | Prima | Dopo |
|---------|-------|------|
| Apertura Drawer | 800-1200ms | **200-400ms** |
| Click → PinDetailCard visibile | 500-800ms | **150-300ms** |
| Errori console (geocoding) | 5-10 per apertura | **0** |
| Re-fetch stats al remount | Ogni volta | **Cached 2min** |

---

## Ordine di Implementazione

1. **Fix immediato**: Lazy address enrichment (blocca UI)
2. **Cache stats**: Persistere cache tra remount
3. **Stats condition**: Rendere più robusta la condizione
4. **Preloaded stats**: Passare da MapSection a PinDetailCard
5. **Pre-fetch on touch**: Bonus per UX premium

Queste modifiche dovrebbero ridurre drasticamente i tempi di caricamento e eliminare il blocco dell'UI causato dalle chiamate Nominatim fallite.

