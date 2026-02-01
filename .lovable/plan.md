
# Piano: Fix Duplicazione Pin e Categoria Temporanea Errata

## Analisi del Problema

### Root Cause 1: Duplicazione Pin
Quando si salva una location temporanea (dalla ricerca Home):
1. Viene creato un `tempMarkerRef` quando si apre la card
2. Al salvataggio, l'evento `location-save-changed` aggiorna l'icona del tempMarker ma non lo rimuove
3. Il realtime di `useMapLocations` riceve la notifica e ricarica le locations dal DB
4. Un nuovo marker viene creato dalla lista `places[]` aggiornata
5. **Entrambi i marker rimangono visibili** → duplicazione

### Root Cause 2: Categoria Diversa sul Pin Temporaneo
1. La ricerca Photon/Nominatim restituisce categorie generiche (es. "pub" → mappato a "bar")
2. Il `tempMarker` viene creato con questa categoria
3. Quando l'utente salva, potrebbe scegliere una categoria diversa
4. Al reload dal DB, la categoria reale potrebbe essere diversa da quella temporanea

## Soluzione

### Modifica 1: Rimuovere tempMarker quando esiste un marker regolare

Nel file `src/components/LeafletMapSetup.tsx`, dopo il salvataggio, quando il marker regolare viene creato dalla lista `places[]`, il `tempMarker` deve essere rimosso per evitare duplicati.

Aggiungere logica nell'effect che gestisce la creazione/rimozione dei marker per verificare se:
- Esiste un `tempMarker` 
- E' stato salvato (`tempMarkerSavedRef.current === true`)
- Esiste ora un marker regolare per la stessa posizione o ID

Se tutte le condizioni sono vere, rimuovere il `tempMarker`.

```typescript
// Linee ~896-940 di LeafletMapSetup.tsx
// Dopo la creazione del temp marker e prima della gestione del selectedMarker

// NUOVO: Se tempMarker è stato salvato E ora esiste un marker regolare per lo stesso place, rimuovi tempMarker
if (tempMarkerRef.current && tempMarkerSavedRef.current && selectedPlace) {
  // Cerca un marker nella lista places che corrisponde alla posizione/ID del selectedPlace
  const hasRegularMarker = markersRef.current.has(selectedPlace.id) || 
    (selectedPlace.coordinates && Array.from(markersRef.current.entries()).some(([id, marker]) => {
      const markerLatLng = marker.getLatLng();
      return Math.abs(markerLatLng.lat - selectedPlace.coordinates.lat) < 0.0001 &&
             Math.abs(markerLatLng.lng - selectedPlace.coordinates.lng) < 0.0001;
    }));
  
  if (hasRegularMarker) {
    try {
      map.removeLayer(tempMarkerRef.current);
      console.log('🗑️ Removed temp marker - regular marker now exists');
    } catch (e) {}
    tempMarkerRef.current = null;
    tempMarkerSavedRef.current = false;
  }
}
```

### Modifica 2: Sincronizzare categoria e ID nel selectedPlace

Nel handler `location-save-changed` (linee ~812-861), quando il save ha successo:
1. Aggiornare anche la categoria del `selectedPlace` se cambiata
2. Propagare l'evento al componente padre per sincronizzare lo state

Attualmente l'evento viene gestito ma non aggiorna la categoria. Dobbiamo modificare anche `MapSection.tsx` per aggiornare la categoria del selectedPlace quando riceve l'evento.

```typescript
// In MapSection.tsx - nel listener location-save-changed (linee ~247-276)
// Aggiungere recupero categoria dal DB se necessario

if (isMatchingPlace && selectedPlace.id !== newLocationId) {
  console.log('🔄 Syncing selectedPlace ID:', oldLocationId, '->', newLocationId);
  
  // Fetch aggiornato della location per ottenere la categoria corretta
  const { data: updatedLocation } = await supabase
    .from('locations')
    .select('id, category')
    .eq('id', newLocationId)
    .maybeSingle();
  
  setSelectedPlace(prev => prev ? {
    ...prev,
    id: newLocationId,
    isTemporary: false,
    isSaved: true,
    category: updatedLocation?.category || prev.category // Usa categoria dal DB
  } : null);
}
```

### Modifica 3: Passare categoria corretta durante il salvataggio

In `PinDetailCard.tsx`, quando viene creata la location (linee ~865-876), la categoria viene presa da `place.category` che potrebbe essere quella temporanea dalla ricerca.

Il problema è che la categoria viene impostata dal risultato della ricerca, non dall'utente. Questo è accettabile, ma dobbiamo assicurarci che dopo il salvataggio, il `selectedPlace` venga aggiornato con la categoria effettivamente salvata.

Dopo la creazione, aggiornare `place.category`:

```typescript
// In PinDetailCard.tsx, dopo la creazione della location (linea ~893)
// Update the place object with real ID AND category from DB
place.id = newLocation.id;
if (newLocation.category) {
  place.category = newLocation.category;
}
```

Ma questo richiede che l'insert restituisca anche la categoria. Modifichiamo la select:

```typescript
// Linea 865-878
const { data: newLocation, error: createError } = await supabase
  .from('locations')
  .insert({
    name: place.name,
    address: place.address,
    latitude: place.coordinates?.lat,
    longitude: place.coordinates?.lng,
    category: place.category || 'restaurant',
    city: place.city,
    created_by: currentUser.id,
    pioneer_user_id: currentUser.id,
  })
  .select('id, category') // Aggiungi category
  .single();

// ... dopo il check di errore
locationId = newLocation.id;
// Aggiorna anche la categoria nel place object
place.category = newLocation.category || place.category;
```

## Riepilogo File da Modificare

| File | Modifica | Scopo |
|------|----------|-------|
| `src/components/LeafletMapSetup.tsx` | Rimuovere tempMarker quando esiste marker regolare dopo save | Fix duplicazione pin |
| `src/components/home/MapSection.tsx` | Sincronizzare categoria nel selectedPlace dopo save | Fix categoria errata |
| `src/components/explore/PinDetailCard.tsx` | Restituire categoria dall'insert e aggiornarla in place | Fix categoria persistente |

## Dettagli Implementazione

### 1. LeafletMapSetup.tsx - Rimozione tempMarker

Nell'effect che gestisce i marker (linee ~864-988), aggiungere prima del blocco `needsTempMarker`:

```typescript
// NUOVO: Rimuovi tempMarker se è stato salvato e ora esiste un marker regolare
if (tempMarkerRef.current && tempMarkerSavedRef.current) {
  // Check se esiste un marker regolare per il selectedPlace
  const selectedId = selectedPlace?.id;
  const hasRegularMarker = selectedId && markersRef.current.has(selectedId);
  
  // Oppure check per coordinate (fallback)
  const hasMarkerByCoords = selectedPlace?.coordinates && 
    Array.from(markersRef.current.entries()).some(([_, marker]) => {
      const pos = marker.getLatLng();
      return Math.abs(pos.lat - selectedPlace.coordinates.lat) < 0.0001 &&
             Math.abs(pos.lng - selectedPlace.coordinates.lng) < 0.0001;
    });
  
  if (hasRegularMarker || hasMarkerByCoords) {
    try {
      map.removeLayer(tempMarkerRef.current);
      console.log('🗑️ Removed stale temp marker after save');
    } catch (e) {}
    tempMarkerRef.current = null;
    tempMarkerSavedRef.current = false;
  }
}
```

### 2. MapSection.tsx - Sync categoria

Modificare il listener `location-save-changed` per fetchare la categoria aggiornata:

```typescript
const handleSaveChanged = async (event: CustomEvent<{...}>) => {
  // ... existing matching logic ...
  
  if (isMatchingPlace && selectedPlace.id !== newLocationId) {
    // Fetch categoria aggiornata dal DB
    const { data: updatedLoc } = await supabase
      .from('locations')
      .select('category')
      .eq('id', newLocationId)
      .maybeSingle();
    
    setSelectedPlace(prev => prev ? {
      ...prev,
      id: newLocationId,
      isTemporary: false,
      isSaved: true,
      category: updatedLoc?.category || prev.category
    } : null);
  }
};
```

### 3. PinDetailCard.tsx - Categoria nell'insert

Aggiungere `category` alla select dell'insert:

```typescript
.select('id, category')

// E dopo:
place.category = newLocation.category || place.category;
```

## Test di Verifica

1. Cercare un luogo dalla ricerca Home (es. "Reply 1988 A Coruña")
2. Aprire la card del luogo
3. Cliccare Salva con un tag
4. Verificare che **non ci siano pin duplicati**
5. Verificare che l'icona categoria sia **coerente** con quella salvata
