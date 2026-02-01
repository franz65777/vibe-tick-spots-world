
Obiettivo: eliminare definitivamente la duplicazione “pin temporaneo + pin reale” quando salvi una location nuova dalla ricerca Home (duplica subito). Dalla diff che hai incollato, la cleanup c’è, ma non scatta nel momento giusto: viene eseguita solo quando cambia `selectedPlace`/tema, mentre il marker “reale” arriva tipicamente dopo, quando `places` viene aggiornato dal DB. Quindi il controllo `hasRegularMarker` fallisce la prima volta e poi l’effetto non si riesegue quando il marker reale appare.

---

## 1) Diagnosi (perché “non è cambiato nulla”)
Nel file `LeafletMapSetup.tsx`:
- La rimozione del temp marker è dentro l’`useEffect` “Hide other markers…” che dipende da `[selectedPlace, isDarkMode]`.
- Quando salvi:
  1) l’evento `location-save-changed` setta `tempMarkerSavedRef.current = true`
  2) `MapSection` aggiorna `selectedPlace.id` (da temp → UUID)
  3) `useMapLocations` refetcha e aggiorna `places` con la location reale
- Problema: lo step (2) avviene spesso prima dello step (3). Quindi nel cleanup:
  - `markersRef.current.has(selectedPlace.id)` è ancora `false` perché il marker reale non è stato creato (places non aggiornato).
  - L’effetto non si riattiva quando poi arriva `places`, quindi il temp marker resta e vedi duplicazione.

Questa è una race condition di dipendenze: la cleanup deve rieseguire anche quando arrivano i nuovi `places` (o quando il marker reale diventa disponibile).

---

## 2) Fix principale (LeafletMapSetup): far scattare la cleanup quando arriva il marker reale
### 2.1 Agganciare l’effetto anche ai cambiamenti di `places`
Modifica l’`useEffect` che gestisce selezione/visibilità markers (quello che contiene:
- restore marker cluster
- creazione temp marker
- hide/show altri marker
- cleanup temp marker

perché si riesegua quando la lista `places` cambia.

Approccio consigliato (per evitare dipendenze “pesanti”):
- creare un `placesKey` stabile (stringa) basata sugli id + categoria (o almeno sugli id) e usarla nei deps dell’effetto.
  - esempio: `const placesKey = useMemo(() => places.map(p => p.id).join('|'), [places]);`
  - poi: `useEffect(..., [selectedPlace, isDarkMode, placesKey]);`

Così, quando il salvataggio fa entrare la nuova location in `places`, l’effetto riesegue e può rimuovere il temp marker.

### 2.2 Cleanup più robusta: se esiste `selectedMarker`, rimuovi sempre il temp marker
Oggi la cleanup cerca un “regular marker” con `markersRef.current.has(selectedPlace.id)` o matching per coordinate. È corretto, ma fragile per timing.

Più robusto:
- appena `selectedMarker` diventa non-null (cioè il marker reale esiste per `selectedPlace.id`), rimuovi `tempMarkerRef.current` immediatamente.
- Questo elimina la duplicazione al primo momento utile, senza dover scandire tutta `markersRef`.

In pratica nel blocco dove già calcoli:
```ts
const selectedId = selectedPlace?.id;
const selectedMarker = selectedId ? markersRef.current.get(selectedId) : null;
```
aggiungi una regola:
- se `selectedMarker` esiste e `tempMarkerRef.current` esiste → rimuovi temp marker e resetta i ref (`tempMarkerRef.current = null; tempMarkerSavedRef.current = false;`).

Nota: questo non “rompe” le location temporanee non salvate, perché in quel caso `selectedMarker` non esisterà mai (non c’è nel DB/places).

---

## 3) Fix secondario: evitare reset/creazioni incoerenti del temp marker
Dopo aver reso l’effetto sensibile a `places`, bisogna assicurarsi che:
- `needsTempMarker` NON ricrei un nuovo temp marker mentre quello precedente è ancora presente
- e soprattutto che quando `selectedMarker` appare, il temp venga rimosso prima di qualsiasi altra operazione visiva.

Ordine raccomandato dentro l’effetto:
1) cleanup “selected marker restore” (se necessario)
2) cleanup temp marker quando `selectedMarker` esiste (nuova regola robusta)
3) cleanup “stale temp marker after save” (può rimanere come fallback, ma diventa meno importante)
4) creazione temp marker (`needsTempMarker`)
5) gestione selectedMarker (rimozione da cluster e addToMap)
6) hide/show altri marker + cluster CSS

---

## 4) Verifica/Debug (per essere certi)
Aggiungere log mirati (temporanei) in `LeafletMapSetup`:
- Quando ricevi `location-save-changed`: stampare `selectedPlace.id`, `oldLocationId/newLocationId`, `tempMarkerSavedRef`
- Quando l’effetto rerun su `placesKey`: stampare `placesKey` changes e se `selectedMarker` esiste
- Quando rimuovi temp marker: log “Removed temp marker because selectedMarker exists” + ids

Questo serve a confermare che ora l’effetto si riattiva quando il marker reale entra in `places`.

---

## 5) Test end-to-end (riproduzione esatta del tuo caso)
1) Home → apri search → seleziona un luogo NON ancora salvato (temp)
2) Si apre PinDetailCard e appare temp marker
3) Premi Salva (con tag/categoria se presente)
4) Atteso:
   - il temp marker resta solo per un istante (max fino al refresh `places`)
   - appena arriva il marker reale (UUID), il temp marker sparisce
   - rimane un solo pin visibile, senza label doppie
5) Ripetere 3-4 volte con luoghi diversi per validare che non è “intermittente”.

---

## File coinvolti
- `src/components/LeafletMapSetup.tsx`
  - aggiunta `placesKey` e dipendenza dell’effetto
  - cleanup immediata del temp marker quando `selectedMarker` esiste
  - mantenere la cleanup “hasRegularMarker” come fallback, ma non dipenderci più come unica via

(Nessuna modifica necessaria a `MapSection.tsx`/`PinDetailCard.tsx` per la duplicazione in sé: lì l’ID/category sync è ok; il problema è principalmente di timing nel map renderer.)

---

## Rischi/Edge cases e mitigazioni
- Prestazioni: rieseguire l’effetto su ogni update di `places` può essere costoso se dipendi da `places` direttamente.
  - Mitigazione: usare `placesKey` stringa leggera (ids) invece di `places` come dipendenza.
- Caso “selectedPlace from folder/list fuori bounds”: `placesKey` cambia spesso? di solito no, perché `places` è filtrato per bounds.
  - La nuova cleanup non rompe nulla perché si attiva solo quando `selectedMarker` esiste.

---