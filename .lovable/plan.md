
## Piano: Fase 7 - Fix Timing Logo 800ms + Spinner Notifiche + Sincronizzazione Salvataggio dalla Ricerca

---

### Problema 1: Delay 800ms per il Logo

**Situazione Attuale:**
Il delay iniziale in `SearchDrawer.tsx` è di 50ms (linea 201).

**Soluzione:**
Cambiare il delay da 50ms a 800ms come richiesto dall'utente.

**File:** `src/components/home/SearchDrawer.tsx` (linea 201)

```tsx
// Prima
}, 50); // Minimal delay for initial render

// Dopo
}, 800); // 800ms delay as per user requirement
```

---

### Problema 2: Rotella di Loading nella Pagina Notifiche

**Analisi:**
Ho verificato che `NotificationsOverlay.tsx` usa già `NotificationsSkeleton` per il loading (linea 261-262). Tuttavia, l'hook `useNotificationData` (che pre-carica i dati per ogni notifica) parte con `loading: true` e impiega tempo per caricare.

**Il problema reale:**
Quando l'overlay si apre, sia `useNotifications` che `useNotificationData` partono con `loading: true`. Questo causa:
1. Prima si vede lo skeleton delle notifiche (da `useNotifications.loading`)
2. Poi quando le notifiche arrivano ma `useNotificationData.loading` è ancora true, l'overlay potrebbe mostrare contenuto incompleto o flash

**Soluzione:**
Verificare che l'overlay non mostri uno stato intermedio problematico. Il componente `VirtualizedNotificationsList` riceve `prefetchedData` che include un flag `loading`. Se questo è true mentre le notifiche sono già caricate, potrebbe causare un comportamento strano.

Dopo ulteriore analisi, noto che `MobileNotificationItem` usa `prefetchedData.loading` per decidere cosa mostrare. Se l'utente vede ancora una "rotella", potrebbe essere uno dei bottoni di azione (Follow, Accept, etc.) che mostrano uno spinner durante il caricamento.

**Verifica necessaria:** Il problema potrebbe essere nella transizione dell'overlay stesso. Il Double RAF pattern applicato in Fase 6 dovrebbe gestire questo, ma potrebbe esserci un problema di timing.

**Azione:** Aggiungere un controllo per evitare di mostrare l'overlay vuoto durante il caricamento iniziale e assicurarsi che lo skeleton venga mostrato immediatamente.

---

### Problema 3: Conflitti Salvataggio dalla Barra di Ricerca

**Analisi Approfondita:**

Ho esaminato il flusso di salvataggio e identificato il problema principale:

**`LocationDetailDrawer.tsx` (linee 500-555):**
- Il componente salva correttamente la location nel database
- **NON emette l'evento `location-save-changed`** dopo il salvataggio!
- Questo significa che MapSection e LeafletMapSetup non vengono notificati

**Conseguenze:**
1. **Duplicato del pin**: Il pin temporaneo rimane sulla mappa perché non viene aggiornato con il nuovo ID
2. **Icona salvataggio non mostrata**: LeafletMapSetup ascolta `location-save-changed` per aggiornare l'icona del marker ma l'evento non arriva mai
3. **Sincronizzazione rotta**: MapSection aggiorna `selectedPlace` solo quando riceve l'evento

**Confronto con PinDetailCard (funziona correttamente):**
```tsx
// PinDetailCard.tsx (linee 908-930)
window.dispatchEvent(new CustomEvent('location-save-changed', {
  detail: { 
    locationId: locationId, 
    isSaved: true, 
    saveTag: tag,
    newLocationId: locationId,
    oldLocationId: originalPlaceId,
    coordinates: place.coordinates
  }
}));
```

**Soluzione:**
Aggiungere l'emissione dell'evento `location-save-changed` in `LocationDetailDrawer.tsx` dopo il salvataggio riuscito, includendo tutti i dettagli necessari per la sincronizzazione.

---

### File da Modificare

1. **`src/components/home/SearchDrawer.tsx`**
   - Linea 201: Cambiare delay da `50` a `800`

2. **`src/components/home/LocationDetailDrawer.tsx`**
   - Linea ~545: Aggiungere emissione evento `location-save-changed` dopo salvataggio
   - Includere: `locationId`, `isSaved`, `saveTag`, `newLocationId`, `oldLocationId`, `coordinates`
   - Linea ~565: Aggiungere emissione evento per unsave

---

### Implementazione Dettagliata

**LocationDetailDrawer.tsx - handleSave:**

```tsx
const handleSave = async (tag: SaveTag) => {
  if (!user?.id || !location) return;
  setLoading(true);
  
  // Store original ID for event
  const originalLocationId = location.id;
  
  try {
    let locationIdToSave = location.id;
    const coordsSource: any = resolvedCoordinates || location.coordinates || {};
    const lat = Number(coordsSource.lat ?? coordsSource.latitude ?? 0);
    const lng = Number(coordsSource.lng ?? coordsSource.longitude ?? 0);
    
    // ... existing location creation logic ...

    const saved = await locationInteractionService.saveLocation(locationIdToSave, {
      // ... existing params ...
    }, tag);
    
    if (saved) {
      setIsSaved(true);
      setCurrentSaveTag(tag);
      toast.success(t('locationSaved', { ns: 'common' }));
      
      // Emit global event for map synchronization
      window.dispatchEvent(new CustomEvent('location-save-changed', {
        detail: { 
          locationId: locationIdToSave, 
          isSaved: true, 
          saveTag: tag,
          newLocationId: locationIdToSave,
          oldLocationId: originalLocationId,
          coordinates: lat && lng ? { lat, lng } : undefined
        }
      }));
      
      // Also emit for google_place_id if present
      if ((location as any).google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { 
            locationId: (location as any).google_place_id, 
            isSaved: true, 
            saveTag: tag,
            newLocationId: locationIdToSave,
            oldLocationId: originalLocationId,
            coordinates: lat && lng ? { lat, lng } : undefined
          }
        }));
      }
    } else {
      toast.error(t('failedToSave', { ns: 'common' }));
    }
  } catch (error) {
    console.error('Error saving location:', error);
    toast.error(t('failedToSave', { ns: 'common' }));
  } finally {
    setLoading(false);
  }
};
```

**LocationDetailDrawer.tsx - handleUnsave:**

```tsx
const handleUnsave = async () => {
  if (!location?.id) return;
  setLoading(true);
  try {
    const unsaved = await locationInteractionService.unsaveLocation(location.id);
    if (unsaved) {
      setIsSaved(false);
      setCurrentSaveTag('been');
      toast.success(t('locationRemoved', { ns: 'common' }));
      
      // Emit global event for map synchronization
      window.dispatchEvent(new CustomEvent('location-save-changed', {
        detail: { locationId: location.id, isSaved: false }
      }));
      
      // Also emit for google_place_id if present
      if ((location as any).google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: (location as any).google_place_id, isSaved: false }
        }));
      }
    }
  } catch (error) {
    console.error('Error unsaving location:', error);
  } finally {
    setLoading(false);
  }
};
```

---

### Risultato Atteso

| Problema | Prima | Dopo |
|----------|-------|------|
| Delay logo | 50ms | 800ms |
| Salvataggio da ricerca | Pin duplicato + icona non aggiornata | Sincronizzazione immediata |
| Icona salvataggio | Non mostrata fino a refresh | Mostrata immediatamente |
| Evento location-save-changed | Non emesso da LocationDetailDrawer | Emesso correttamente con tutti i dati |

---

### Note Tecniche

**Perché il problema non si verifica con PinDetailCard:**
PinDetailCard (usato quando si clicca un pin sulla mappa) emette correttamente l'evento `location-save-changed` con tutti i dettagli necessari. LocationDetailDrawer (usato dalla ricerca) non lo faceva.

**Flusso di sincronizzazione corretto:**
1. Utente salva location da LocationDetailDrawer
2. Evento `location-save-changed` emesso con `newLocationId`, `oldLocationId`, `coordinates`
3. MapSection riceve evento e aggiorna `selectedPlace.id` con il nuovo ID database
4. LeafletMapSetup riceve evento e aggiorna l'icona del marker temporaneo
5. Il pin rimane visibile con l'icona corretta senza duplicati
