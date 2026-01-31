

# Piano: Fix Critico Costi Google Places API

## Problema Rilevato

I costi Google Places API sono saliti a **$101 a gennaio 2026** nonostante nessuna nuova location salvata:
- **1093 chiamate Place Photos** → $45.24
- **2203 chiamate Place Details (opening_hours)** → $37.26
- **1110 chiamate Find Place** → $18.77

**Root Cause**: La stessa location ha fino a **15 chiamate API al mese** perché:
1. Il frontend in-memory cache dura solo **5 minuti**
2. Dopo 5 minuti, ogni apertura della card chiama la edge function
3. Le locations da `saved_places` non includono `opening_hours_data` nel Place object

## Analisi Tecnica

### Flusso Attuale (Problematico)

```text
User clicca pin
      │
      ▼
PinDetailCard monta
      │
      ▼
useOpeningHours({cachedOpeningHours: place.opening_hours_data})
      │
      ├─ IF cachedOpeningHours esiste → USA CACHE ✅
      │
      └─ IF cachedOpeningHours è null/undefined
            │
            ├─ Controlla openingHoursCache (memoria, 5min) 
            │     └─ Spesso scaduta dopo 5 minuti
            │
            └─ Chiama edge function get-place-hours
                  │
                  ├─ Edge function controlla DB cache ✅
                  │
                  └─ MA viene tracciata come chiamata API! ❌
```

### Problemi Specifici

| Problema | File | Impatto |
|----------|------|---------|
| `saved_places` non include `opening_hours_data` | `useMapLocations.ts` | Alto |
| In-memory cache dura solo 5 minuti | `useOpeningHours.ts` | Alto |
| Non pre-fetch `opening_hours_data` per saved_places | `useMapLocations.ts` | Alto |
| `useLocationPhotos` ha lo stesso problema | `useLocationPhotos.ts` | Medio |

---

## Soluzione

### Fase 1: Pre-fetch Opening Hours per Saved Places

**File**: `src/hooks/useMapLocations.ts`

Attualmente viene pre-caricato `photos` per `saved_places` dalla tabella `locations`:
```typescript
// Linea 1065-1077 (già esiste per photos)
const { data: locationsWithPhotos } = await supabase
  .from('locations')
  .select('google_place_id, photos')
  .in('google_place_id', savedPlaceGoogleIds)
  .not('photos', 'is', null);
```

**Modifica**: Aggiungere anche `opening_hours_data`:
```typescript
const { data: locationsWithCache } = await supabase
  .from('locations')
  .select('google_place_id, photos, opening_hours_data')
  .in('google_place_id', savedPlaceGoogleIds);

// Mappare opening_hours_data oltre a photos
const hoursMapForSavedPlaces = new Map<string, any>();
locationsWithCache?.forEach((loc: any) => {
  if (loc.google_place_id && loc.opening_hours_data) {
    hoursMapForSavedPlaces.set(loc.google_place_id, loc.opening_hours_data);
  }
});
```

Questo va applicato in **4 punti**:
1. Caso `'popular'` (linee 1061-1081)
2. Caso `'mysaves'` (linee 1322-1344)
3. Caso `'following'` (se non già presente)
4. Caso `'shared'` (se applicabile)

### Fase 2: Estendere Cache Frontend a 24 Ore

**File**: `src/hooks/useOpeningHours.ts`

Modificare:
```typescript
// PRIMA (linea 22)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// DOPO
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

**File**: `src/hooks/useLocationPhotos.ts`

Aggiungere cache in-memory simile (attualmente non presente):
```typescript
// Aggiungere in-memory cache module-level
const photosCache = new Map<string, { photos: string[]; timestamp: number }>();
const PHOTOS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Nel fetchPhotos, controllare cache prima di chiamare edge function
```

### Fase 3: Query Database Prima di Edge Function

**File**: `src/hooks/useOpeningHours.ts`

Prima di chiamare la edge function, controllare se i dati esistono già nel database:

```typescript
// Dopo il check in-memory cache (linea 145), aggiungere:
// Check database cache BEFORE calling edge function
if (locationId) {
  try {
    const { data: dbCached } = await supabase
      .from('locations')
      .select('opening_hours_data, opening_hours_source')
      .eq('id', locationId)
      .single();
    
    if (dbCached?.opening_hours_data) {
      const parsed = parseOpeningHoursData(dbCached.opening_hours_data);
      const newData: OpeningHoursData = {
        isOpen: parsed.isOpen,
        todayHours: parsed.todayHours,
        dayIndex,
        loading: false,
        error: null
      };
      openingHoursCache.set(cacheKey, { data: newData, timestamp: Date.now() });
      setData(newData);
      return; // NO edge function call!
    }
  } catch (e) {
    console.warn('Failed to check DB cache for hours:', e);
  }
}
```

### Fase 4: Stessa Logica per Photos

**File**: `src/hooks/useLocationPhotos.ts`

Prima di chiamare la edge function, controllare il database:
```typescript
// Nel fetchPhotos, dopo i check esistenti (linee 50-81):
// Check database by google_place_id if not already checked
if (googlePlaceId && !forceRefresh) {
  const { data: dbCached } = await supabase
    .from('locations')
    .select('photos')
    .eq('google_place_id', googlePlaceId)
    .not('photos', 'is', null)
    .limit(1)
    .maybeSingle();

  if (dbCached?.photos && Array.isArray(dbCached.photos) && dbCached.photos.length > 0) {
    console.log(`✅ Photos DB cache hit for google_place_id: ${googlePlaceId}`);
    setPhotos(dbCached.photos as string[]);
    setSource('cache');
    // Populate in-memory cache
    photosCache.set(cacheKey, { photos: dbCached.photos, timestamp: Date.now() });
    setLoading(false);
    return;
  }
}
```

---

## Riepilogo File da Modificare

| File | Modifica | Priorità |
|------|----------|----------|
| `src/hooks/useMapLocations.ts` | Pre-fetch `opening_hours_data` per saved_places | 🔴 Critica |
| `src/hooks/useOpeningHours.ts` | Cache 24h + check DB prima di edge function | 🔴 Critica |
| `src/hooks/useLocationPhotos.ts` | Aggiungere in-memory cache 24h + check DB | 🟡 Alta |

---

## Impatto Previsto

| Metrica | Prima | Dopo |
|---------|-------|------|
| Chiamate API/mese per location | 10-15 | 1 (solo prima apertura) |
| Costo mensile stimato | $100+ | <$10 |
| Chiamate edge function | Ogni 5 min | Solo se dati non in DB |

---

## Note Tecniche

### Pre-fetch Opening Hours - Dettaglio

Nel caso `'popular'` di `useMapLocations.ts`, aggiungere subito dopo il pre-fetch photos (linea 1077):

```typescript
// Pre-fetch opening_hours_data together with photos
const { data: locationsWithCache } = await supabase
  .from('locations')
  .select('google_place_id, photos, opening_hours_data')
  .in('google_place_id', savedPlaceGoogleIds);

const photosMapForSavedPlaces = new Map<string, string[]>();
const hoursMapForSavedPlaces = new Map<string, any>();

locationsWithCache?.forEach((loc: any) => {
  if (loc.google_place_id) {
    if (loc.photos && Array.isArray(loc.photos) && loc.photos.length > 0) {
      photosMapForSavedPlaces.set(loc.google_place_id, loc.photos as string[]);
    }
    if (loc.opening_hours_data) {
      hoursMapForSavedPlaces.set(loc.google_place_id, loc.opening_hours_data);
    }
  }
});

if (photosMapForSavedPlaces.size > 0 || hoursMapForSavedPlaces.size > 0) {
  console.log(`✅ Pre-loaded cache for ${photosMapForSavedPlaces.size} photos, ${hoursMapForSavedPlaces.size} opening_hours from DB`);
}
```

Poi nel building del MapLocation per saved_places (linea 1100-1112):

```typescript
fromSavedPlaces.push({
  id: googlePlaceId,
  name: sp.place_name || 'Unknown',
  // ... existing fields ...
  photos: photosMapForSavedPlaces.get(googlePlaceId),
  opening_hours_data: hoursMapForSavedPlaces.get(googlePlaceId), // NUOVO!
  // ...
});
```

### Hook Cache Upgrade - Dettaglio

In `useOpeningHours.ts`, la nuova struttura sarà:

```typescript
useEffect(() => {
  // 1. Check cachedOpeningHours prop (instant)
  if (cachedOpeningHours) { ... return; }
  
  // 2. Check in-memory cache (24h)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) { ... return; }
  
  // 3. NEW: Check database directly (no edge function!)
  if (locationId || googlePlaceId) {
    const dbCached = await checkDatabaseCache();
    if (dbCached) { ... return; }
  }
  
  // 4. ONLY if all caches miss, call edge function
  await supabase.functions.invoke('get-place-hours', ...);
}, [...]);
```

Questa architettura garantisce che le chiamate API Google vengano fatte **solo una volta per location**, mai ripetute.

