
Obiettivo: far sì che la dropdown dei risultati nell’Add overlay usi tutta la larghezza disponibile (la stessa fascia orizzontale della search pill + tasto X) e rimuovere le duplicazioni (stesso luogo mostrato due volte “con foto” e “senza foto”).

---

## 1) Perché oggi la dropdown è “stretta” (root cause)
Attualmente la dropdown dei risultati è `position: absolute` dentro `OptimizedPlacesAutocomplete`, che a sua volta vive **dentro la search pill** (solo la parte sinistra del header). Quindi, per definizione, la dropdown non potrà mai estendersi sotto l’area del tasto **X** a destra, perché è “ancorata” a un contenitore più piccolo.

---

## 2) Soluzione layout: spostare il rendering della dropdown a livello header (full width)
### Approccio
- Lasciamo `OptimizedPlacesAutocomplete` come “input + ricerca”, ma gli togliamo la responsabilità di renderizzare la lista.
- Renderizziamo la lista risultati **in AddPageOverlay**, subito sotto l’header, in un container full-width con lo stesso padding del header (`px-3`) così:
  - Larghezza = search pill + X (stessa riga del header)
  - Allineamento perfetto con il layout esistente

### Modifiche previste
**File: `src/components/OptimizedPlacesAutocomplete.tsx`**
- Aggiungere una prop opzionale tipo:
  - `hideDropdown?: boolean` (default `false`)
  - `onResultsDataChange?: (data: { query; isLoading; results: SearchResult[]; isSearching: boolean }) => void`
- Quando cambia `query/isLoading/allResults`, notificare il parent (AddPageOverlay) tramite `onResultsDataChange`.
- Se `hideDropdown` è `true`, **non renderizzare** il blocco dropdown interno (quello `absolute z-50 ...`).

**File: `src/components/add/AddPageOverlay.tsx`**
- Inserire uno state locale per i risultati:
  - `searchQuery`, `isSearching`, `isLoading`, `results`
- Passare a `OptimizedPlacesAutocomplete`:
  - `hideDropdown={true}`
  - `onResultsDataChange={...}` per salvare i dati.
- Renderizzare la lista in overlay, subito dopo `</header>`:
  - Container con `px-3` (uguale al header), `mt-2`, `max-h`, `overflow-y-auto`, `z` alto
  - Ogni row `w-full` (qui davvero full width perché il container è full)

Risultato atteso: la lista occupa tutta la fascia orizzontale (sotto search pill + X), come richiesto nello screenshot.

---

## 3) Fix duplicazioni: dedup “intelligente” con priorità immagini
Il problema “duplicato con foto e senza” molto spesso nasce da:
- stesso luogo presente due volte nel DB (o DB + Google) con informazioni diverse
- dedup attuale copre soprattutto DB vs Google (per `google_place_id` o `name`), ma non:
  - duplicati interni al DB
  - duplicati dove uno record ha `photos/image_url` e l’altro no (quindi li vedi entrambi)

### Approccio dedup
Implementare una funzione di dedup/merge che:
1) Raggruppa per `google_place_id` quando presente
2) Se manca, fallback su chiave normalizzata: `name + address` (lowercase, trim, collassare spazi)
3) Quando ci sono più candidati nello stesso gruppo, scegliere il “migliore” con questa priorità:
   - (A) `image_url` (business account image) vince sempre
   - (B) `photos?.length` maggiore
   - (C) preferire `source === 'database'` (ha più dati e nessun costo)
   - (D) fallback sul primo

### Dove applicarla
**File: `src/components/OptimizedPlacesAutocomplete.tsx`**
- Dopo aver costruito `allResults` (DB + deduplicated Google), applicare una dedup finale:
  - `const mergedResults = mergeAndDedupResults(allResults)`
- Usare `mergedResults` sia per:
  - keyboard navigation
  - callback verso AddPageOverlay (se implementata)
  - rendering (se in futuro si renderizza ancora qui)

Questo risolve duplicati sia DB-only sia DB+Google.

---

## 4) Stile rows: full-width reale + immagine piccola + 2 righe (name + address)
Nel rendering in AddPageOverlay:
- Row container: `button` con `w-full` e padding coerente (`px-4 py-3`)
- Thumbnail: `w-10 h-10` (o anche `w-9 h-9` se vuoi ancora più piccolo)
- Immagine: usare esattamente la logica già presente:
  1) `image_url` (business)
  2) `photos[0]` (DB)
  3) `getCategoryImage(...)` (fallback)
- Testi:
  - riga 1: `name` (bold)
  - riga 2: `address` (muted). Se address vuoto, fallback `city`.

Nota: questa parte è già quasi corretta nel componente, ma la sposteremo nel posto giusto (overlay) per risolvere la larghezza.

---

## 5) Verifica “non sembra dentro un container”
Per evitare l’effetto “card/box”:
- Nessun `bg-*` o `rounded-*` sul wrapper della lista
- Solo `border-b` sulle righe
- `z-index` alto per stare sopra al backdrop/hero (es. `z-[2147483641]` come resto overlay)

---

## 6) File toccati
1) `src/components/OptimizedPlacesAutocomplete.tsx`
   - aggiunta prop `hideDropdown`
   - aggiunta callback `onResultsDataChange`
   - dedup/merge finale più robusto
2) `src/components/add/AddPageOverlay.tsx`
   - gestire stato risultati
   - renderizzare la lista sotto l’header a piena larghezza

---

## 7) Test checklist (rapida)
- Digitando 2+ caratteri: la lista appare full width sotto header e passa sotto l’area del tasto X.
- Clic su un risultato seleziona correttamente e chiude overlay come prima.
- Nessun duplicato visibile (stesso posto non appare due volte con/ senza foto).
- Nessuna chiamata extra: immagini solo da DB (`image_url`/`photos`) o icone locali; Google details solo al tap come già oggi.
