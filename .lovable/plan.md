
## Obiettivo
Risolvere definitivamente:
1) **Duplice pin “uno sopra l’altro”** (pin normale + pin “selezionato”/temporaneo con cerchio) che sparisce solo cambiando tab o refresh.
2) **Creazione “location di facciata”** (record `locations` creati lato UI con dati incompleti/sbagliati) + **save tag errato** nel flow di salvataggio da ricerca/drawer.

---

## Cosa sta succedendo (diagnosi)
### A) Duplicazione pin
In `src/components/LeafletMapSetup.tsx`:
- Quando selezioni una location che **non ha marker** in `places[]`, viene creato un **temp marker** (`tempMarkerRef`).
- Dopo il salvataggio, `tempMarkerSavedRef.current = true` e la pulizia del temp marker avviene **solo** quando il marker “regolare” compare in `places[]` (o quando la selection resta aperta e scatta il cleanup del marker effect).
- Se l’utente **chiude la PinLocation card subito**, `selectedPlace` diventa `null` ma **il temp marker NON viene rimosso** perché la cleanup “quando selectedPlace è null” è vincolata a `!tempMarkerSavedRef.current`.
Risultato: rimane il pin con cerchio sopra al pin normale finché non avviene un refresh/ricarico markers.

### B) “Location di facciata” + save tag errato
Ci sono due punti in cui stiamo creando direttamente `locations` dal frontend (bypassando `locationInteractionService.saveLocation`, che invece ha già logica di dedup/validazione Google + risoluzione internal id):

1) `src/components/explore/PinDetailCard.tsx`  
   - Se “needsCreation”, fa una `insert` in `locations` senza garantire `google_place_id` valido e con category potenzialmente errata.
   - Inoltre muta `place.id = newLocation.id` (mutazione di prop/oggetto) → può creare inconsistenze nel flusso selection/markers.

2) `src/components/home/LocationDetailDrawer.tsx`  
   - Se `!locationIdToSave`, fa una `insert` in `locations` prima di chiamare il service.
   - Questo aumenta la probabilità di record “placeholder” e mismatch tra ID (google_place_id vs internal uuid), causando anche **tag letto male** (perché alcune query controllano `user_saved_locations` con `location.id` che potrebbe non essere un UUID valido).

---

## Implementazione proposta (fix robusto e “live”)

### 1) Fix duplicazione “live” con PROMOZIONE del temp marker al momento del salvataggio
**File:** `src/components/LeafletMapSetup.tsx`

**Modifica chiave:** nell’handler dell’evento `location-save-changed` (useEffect “Listen for location save events…”), quando arriva:
- `isSaved: true`
- `newLocationId` presente
- l’evento corrisponde alla selection/temp marker (match per `oldLocationId/newLocationId/locationId` o coordinate)

fare subito:
1. Determinare `targetId = newLocationId` (UUID)
2. Determinare coordinate (prima `event.detail.coordinates`, fallback `selectedPlace.coordinates`)
3. Se esiste già `markersRef.current.get(targetId)` → rimuovere temp marker immediatamente.
4. Se NON esiste:
   - creare **subito** un marker regolare con id `targetId` e stessa posizione (usando `createLeafletCustomMarker` con `isSaved: true`, `isSelected: true`, `category` dall’evento se presente o da `selectedPlace.category`).
   - inserirlo nel `clusterGroup` + `markersRef` + `markerConfigsRef` + **coord index** (`markerCoordKeyByIdRef` / `markerIdByCoordKeyRef`).
   - rimuovere `tempMarkerRef` e azzerare `tempMarkerSavedRef`.

**In più (anti-doppio ID):**
- Se l’evento porta `oldLocationId` e in `markersRef` esiste ancora un marker con l’ID vecchio (temp id o google id) alla stessa posizione, rimuoverlo dal cluster/map e pulire gli indici. Questo evita “due marker diversi” per lo stesso punto.

**Perché risolve davvero:**
- Non aspetti più il refetch di `places[]` per togliere il marker temporaneo.
- Alla chiusura della card, resta **solo** il marker “promosso” (o già presente).

---

### 2) Cleanup corretto quando si chiude la card (selectedPlace -> null)
**File:** `src/components/LeafletMapSetup.tsx`

Oggi: quando `selectedPlace` diventa null, si rimuove il temp marker solo se `!tempMarkerSavedRef.current`.  
**Modifica:** se `selectedPlace` è null, e il temp marker era “saved” (`tempMarkerSavedRef.current === true`), rimuoverlo comunque **se** ormai esiste un marker regolare in zona (check O(1) via `markerIdByCoordKeyRef` usando la last-known coord del temp marker o memorizzandola in un ref).

Implementazione semplice:
- aggiungere un ref `tempMarkerCoordKeyRef` per ricordare la coordKey del temp marker quando viene creato.
- quando `selectedPlace` diventa null:
  - se `tempMarkerRef.current` esiste:
    - se `tempMarkerSavedRef.current === false` → rimuovi sempre (come oggi)
    - se `true` → rimuovi se `markerIdByCoordKeyRef.current.has(tempMarkerCoordKeyRef.current)` (ovvero esiste un marker regolare nello stesso punto)

Nota: con il punto (1) la maggior parte dei casi sarà già “live”, ma questo rende il sistema più robusto.

---

### 3) Eliminare la creazione “manuale” di locations (niente più “facciata”)
#### 3a) PinDetailCard: rimuovere insert diretto su `locations`
**File:** `src/components/explore/PinDetailCard.tsx`

Attualmente:
- fa query “existing by coords” e poi `insert` in `locations` con dati parziali
- muta `place.id` e `place.category`

**Modifica:**
- rimuovere tutta la sezione `needsCreation` che inserisce record direttamente.
- chiamare sempre e solo:
  ```ts
  locationInteractionService.saveLocation(place.id, locationData, tag)
  ```
  passando `locationData` completo (incl. google_place_id, coords, name, address, category).
- usare solo variabili locali (no `place.id = ...`).

**Ragione:** il service ha già:
- lookup per `google_place_id`
- validazione (`validate-location` edge)
- creazione location con `google_place_id` quando necessario
- dedup su existing location

#### 3b) LocationDetailDrawer: rimuovere insert diretto su `locations`
**File:** `src/components/home/LocationDetailDrawer.tsx`

Attualmente:
- se manca `locationIdToSave` crea un record `locations` prima di chiamare il service.

**Modifica:**
- chiamare direttamente `locationInteractionService.saveLocation(...)` usando come `locationId`:
  - preferenza: `(location as any).google_place_id` se esiste
  - altrimenti `location.id`
- lasciare che sia il service a creare/risolvere l’internal UUID.

---

### 4) Fix “save tag errato” nei punti in cui stiamo leggendo lo stato salvato con ID non-UUID
**File:** `src/components/home/LocationDetailDrawer.tsx` (checkSaved effect)

Oggi il drawer verifica:
```ts
.from('user_saved_locations').eq('location_id', location.id)
```
Se `location.id` è un google_place_id (non UUID), il check fallisce e fa fallback a `'been'` → “tag sbagliato” in UI.

**Modifica:**
- se `location.id` non è UUID:
  - risolvere l’internal id via query `locations` by `google_place_id` (usare `location.google_place_id` o `location.id` se sembra un google id)
  - usare l’internal id per leggere `user_saved_locations.save_tag`
- opzionale (più pulito): aggiungere al `locationInteractionService` un helper `getSaveTag(locationIdOrGoogleId)` e riusarlo.

---

## Verifica (casi da testare end-to-end)
1) Dalla Home / ricerca, apri una location non ancora in `places[]` → compare pin temporaneo.
2) Salva con tag (es. “favourite”):
   - entro 0–200ms deve rimanere **un solo** pin (niente doppio titolo, niente pin sovrapposti).
3) Chiudi la PinLocation card immediatamente dopo il salvataggio:
   - deve restare **un solo** pin “normale” senza quello con cerchio sopra.
4) Riapri la location:
   - il tag mostrato deve essere quello scelto (non “been” di default).
5) Ripeti con location con `google_place_id` e con location “esterne” (photon/nominatim/overpass) se presenti nel tuo flow.

---

## Rischi / Edge cases considerati
- Eventi doppi: in `PinDetailCard` e `LocationDetailDrawer` vengono emessi eventi anche per `google_place_id` → la promozione marker deve ignorare duplicati (se marker già creato).
- Collisione coordKey: usiamo 5 decimali (~1.1m). Va bene per dedup marker nel caso “pin sovrapposti”; se due place diverse sono davvero entro 1m, potrebbero collidere. Possibile mitigazione: 6 decimali o includere anche name hash nel key per temp marker (solo per temp marker), ma partirei da 5 perché l’obiettivo qui è rimuovere sovrapposizioni identiche.
- Nessun refetch immediato: il marker “promosso” garantisce UX “live” anche se il refresh della lista arriva dopo.

---

## File che toccherò
- `src/components/LeafletMapSetup.tsx`
- `src/components/explore/PinDetailCard.tsx`
- `src/components/home/LocationDetailDrawer.tsx`
- (opzionale) `src/services/locationInteractionService.ts` (solo se aggiungiamo helper per save_tag resolution)

---

## Output atteso
- Nessuna duplicazione pin “cerchio sopra” immediatamente dopo Save o Close.
- Nessuna creazione di record `locations` “placeholder” dal frontend.
- Save tag coerente e mostrato correttamente anche quando l’ID iniziale è un `google_place_id`.
