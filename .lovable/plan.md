

## Piano: Sincronizzazione in Tempo Reale del Salvataggio Location

### Problema Identificato

Quando salvi una location aperta dalla ricerca:

1. **PinDetailCard** crea la location nel database e aggiorna `place.id` con il nuovo UUID
2. L'evento `location-save-changed` viene emesso 
3. Il marker temporaneo mostra l'icona "salvato" ✓
4. **MA** il realtime refresh (dopo 1 secondo) causa il re-fetch delle locations
5. Lo stato `selectedPlace` in `MapSection` punta ancora all'oggetto vecchio (con ID temporaneo)
6. La cache viene invalidata e il pin "scompare" perché l'ID non corrisponde più

### Soluzione

Modificare il flusso per **propagare l'ID aggiornato** al componente padre e **preservare il pin selezionato** durante i refresh.

---

### Modifiche Tecniche

#### 1. Aggiornare l'evento `location-save-changed` con il nuovo ID

**File**: `src/components/explore/PinDetailCard.tsx`

Aggiungere un nuovo campo `newLocationId` all'evento per permettere ai componenti di aggiornare i loro riferimenti:

```typescript
// In handleSaveWithTag, dopo il salvataggio:
window.dispatchEvent(new CustomEvent('location-save-changed', {
  detail: { 
    locationId: locationId, 
    isSaved: true, 
    saveTag: tag,
    newLocationId: locationId,  // NUOVO: ID interno della location creata
    oldLocationId: originalPlaceId, // NUOVO: ID originale (temporaneo/google)
    coordinates: place.coordinates  // NUOVO: per matching alternativo
  }
}));
```

#### 2. Aggiornare `selectedPlace` quando l'ID cambia

**File**: `src/components/home/MapSection.tsx`

Aggiungere un listener per aggiornare `selectedPlace` quando la location viene salvata:

```typescript
// Nuovo useEffect per sincronizzare selectedPlace dopo il salvataggio
useEffect(() => {
  const handleSaveChanged = (event: CustomEvent) => {
    const { isSaved, newLocationId, oldLocationId, coordinates } = event.detail;
    
    // Se abbiamo un pin selezionato e questo evento riguarda quel pin
    if (selectedPlace && isSaved && newLocationId) {
      const isMatchingPlace = 
        selectedPlace.id === oldLocationId ||
        selectedPlace.id === newLocationId ||
        selectedPlace.isTemporary ||
        (selectedPlace.coordinates?.lat === coordinates?.lat && 
         selectedPlace.coordinates?.lng === coordinates?.lng);
      
      if (isMatchingPlace) {
        // Aggiorna selectedPlace con il nuovo ID interno
        setSelectedPlace(prev => prev ? {
          ...prev,
          id: newLocationId,
          isTemporary: false,
          isSaved: true
        } : null);
      }
    }
  };
  
  window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
  return () => window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
}, [selectedPlace]);
```

#### 3. Preservare il pin durante i refresh realtime

**File**: `src/hooks/useMapLocations.ts`

Aggiungere un meccanismo per evitare che il refresh causi la scomparsa del pin:

```typescript
// In debouncedRefresh, aggiungere un flag per preservare lo stato
const debouncedRefresh = useCallback((preserveSelection = true) => {
  if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
  refreshTimeoutRef.current = setTimeout(() => {
    console.log('🔄 Map data changed via centralized realtime, refreshing...');
    // Fetch senza invalidare la selezione corrente
    fetchLocations();
  }, 1000);
}, []);
```

#### 4. Aggiornare il marker temporaneo correttamente

**File**: `src/components/LeafletMapSetup.tsx`

Migliorare il listener `location-save-changed` per gestire il cambio di ID:

```typescript
// In useEffect per location-save-changed (linea ~813)
const handleSaveChange = (e: CustomEvent) => {
  const { locationId, isSaved, newLocationId, oldLocationId, coordinates } = e.detail;
  const map = mapRef.current;
  if (!map || !tempMarkerRef.current || !selectedPlace) return;
  
  // Check se questo evento riguarda il nostro temp marker
  const isForTempLocation = 
    selectedPlace.id === locationId ||
    selectedPlace.id === oldLocationId ||
    selectedPlace.isTemporary ||
    (coordinates && 
     Math.abs(selectedPlace.coordinates?.lat - coordinates.lat) < 0.0001 &&
     Math.abs(selectedPlace.coordinates?.lng - coordinates.lng) < 0.0001);
  
  if (isForTempLocation && isSaved) {
    tempMarkerSavedRef.current = true;
    
    // Aggiorna l'icona per mostrare che è salvato
    const newIcon = createLeafletCustomMarker({
      category: selectedPlace.category || 'attraction',
      name: selectedPlace.name,
      isSaved: true,
      // ... resto dei parametri
    });
    
    tempMarkerRef.current.setIcon(newIcon);
  }
};
```

---

### Flusso Dopo la Modifica

```
1. Utente apre location dalla ricerca
   └─> selectedPlace = { id: 'ChIJ...', isTemporary: true, ... }

2. Utente salva la location
   └─> PinDetailCard crea location con UUID 'abc-123'
   └─> Emette evento: { oldLocationId: 'ChIJ...', newLocationId: 'abc-123' }

3. MapSection riceve evento
   └─> Aggiorna selectedPlace.id = 'abc-123'
   └─> selectedPlace.isTemporary = false

4. LeafletMapSetup riceve evento
   └─> tempMarkerSavedRef = true (marker non viene rimosso)
   └─> Icona aggiornata con stato "salvato"

5. Realtime refresh (dopo 1 secondo)
   └─> useMapLocations ricarica la lista
   └─> Nuova location con id 'abc-123' è nella lista
   └─> selectedPlace.id === location.id ✓ (match corretto)
   └─> Pin rimane visibile ✓
```

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/explore/PinDetailCard.tsx` | Aggiungere `newLocationId` e `oldLocationId` all'evento `location-save-changed` |
| `src/components/home/MapSection.tsx` | Aggiungere listener per aggiornare `selectedPlace` dopo il salvataggio |
| `src/components/LeafletMapSetup.tsx` | Migliorare il matching dell'evento `location-save-changed` |

---

### Vantaggi

1. **Pin rimane visibile** - Non scompare più dopo il salvataggio
2. **ID sincronizzato** - selectedPlace ha sempre l'ID corretto
3. **Nessuna chiamata API extra** - Sfrutta gli eventi già esistenti
4. **Retrocompatibile** - Non rompe altri componenti che usano l'evento

