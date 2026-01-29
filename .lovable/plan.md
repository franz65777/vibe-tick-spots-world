
## Rendere i Filtri Save Tag Funzionanti per il Filtro "Amici"

### Situazione Attuale

Attualmente il drawer "Posizioni" sulla mappa mostra i filtri save tag (Been, To Try, Favourite) sia per "Salvati" che per "Amici" a livello UI, ma il backend (useMapLocations) applica il filtro `selectedSaveTags` **solo** per il filtro "saved", non per "following".

Questo significa che quando selezioni "Favourite" in modalità "Amici", il filtro non funziona - vengono mostrate tutte le location degli amici invece di solo quelle contrassegnate come favourite.

---

### Modifiche Tecniche

#### 1. useMapLocations.ts - Aggiungere filtro save_tag per "following" 

**Problema**: Nel case `following` (righe 268-814), le query per `user_saved_locations` e `saved_places` non filtrano per `save_tag`.

**Soluzione**: Aggiungere `.in('save_tag', selectedSaveTags)` alle query quando `selectedSaveTags.length > 0`, come già fatto per il case `saved`.

**Righe da modificare**:

1. **Con mapBounds (riga ~301-310)**: Query `user_saved_locations`
```typescript
// Aggiungere filtro save_tag
let savedInternalQuery = supabase
  .from('user_saved_locations')
  .select(...)
  .in('user_id', followedUserIds)
  .not('location', 'is', null);

if (selectedSaveTags.length > 0) {
  savedInternalQuery = savedInternalQuery.in('save_tag', selectedSaveTags);
}

const { data: savedInternal } = await savedInternalQuery;
```

2. **Con mapBounds (riga ~314-317)**: Query `saved_places`
```typescript
let savedPlacesQuery = supabase
  .from('saved_places')
  .select(...)
  .in('user_id', followedUserIds);

if (selectedSaveTags.length > 0) {
  savedPlacesQuery = savedPlacesQuery.in('save_tag', selectedSaveTags);
}

const { data: savedPlaces } = await savedPlacesQuery;
```

3. **Senza mapBounds (riga ~590-602)**: Query `user_saved_locations`
```typescript
let savedInternalQuery = supabase
  .from('user_saved_locations')
  .select(...)
  .in('user_id', followedUserIds)
  .not('location', 'is', null)
  .limit(800);

if (selectedSaveTags.length > 0) {
  savedInternalQuery = savedInternalQuery.in('save_tag', selectedSaveTags);
}

const { data: savedInternal } = await savedInternalQuery;
```

4. **Senza mapBounds (riga ~605-609)**: Query `saved_places`
```typescript
let savedPlacesQuery = supabase
  .from('saved_places')
  .select('place_id, created_at, user_id, place_name, place_category, city, coordinates, save_tag')
  .in('user_id', followedUserIds)
  .limit(800);

if (selectedSaveTags.length > 0) {
  savedPlacesQuery = savedPlacesQuery.in('save_tag', selectedSaveTags);
}

const { data: savedPlaces } = await savedPlacesQuery;
```

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/hooks/useMapLocations.ts` | Aggiungere filtro `selectedSaveTags` alle 4 query nel case `following` |

---

### Comportamento Risultante

1. **Nessun tag selezionato**: Mostra tutte le location degli amici (comportamento attuale)
2. **Tag selezionato (es. Favourite)**: Mostra solo le location degli amici contrassegnate come "Favourite"
3. **Tag multipli selezionati**: Mostra location che corrispondono a uno qualsiasi dei tag selezionati

---

### Note Aggiuntive

- La UI già mostra i `SaveTagInlineFilters` per il filtro "following" (riga 647-651 di MapSection.tsx)
- Lo stato `selectedSaveTags` viene già passato a `useMapLocations` (riga 222 di MapSection.tsx)
- Non serve toccare nessun componente UI - solo la logica di backend nel hook
