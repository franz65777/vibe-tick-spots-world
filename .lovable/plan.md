
## Obiettivo
Risolvere 3 regressioni del drawer “Posizioni”:
1) La mappa non si vede dietro/“sopra” lo slider (drawer) quando la lista è aperta.
2) L’anello (ring) sugli avatar nel filtro amici viene tagliato.
3) Rimuovere la barra grigia “drag handle” in alto.
In più: ripristinare padding dell’header e lo scroll verticale della lista.

---

## Diagnosi rapida (cosa sta succedendo ora)
### 1) Mappa non visibile
In `src/components/home/MapSection.tsx` la mappa viene **nascosta** quando il list drawer è aperto:

- Attuale:
  - wrapper map: `className={isListViewOpen ? 'opacity-0 pointer-events-none' : ''}`
  - quindi anche se il drawer è trasparente, dietro non c’è nulla da vedere: la mappa è letteralmente invisibile.

### 2) Ring avatar tagliato
In `ListDrawerSubFilters.tsx` il contenitore degli avatar è `overflow-x-auto`. Spesso questo (o un parent) implica clipping verticale quando i ring “sporgono” (specialmente con `ring-offset`).
Abbiamo già aumentato `pt-2 pb-2`, ma serve anche permettere overflow verticale visibile.

### 3) Barra grigia in alto
In `MapSection.tsx` usiamo `showHandle={false}`. Tuttavia può comunque comparire:
- perché in altri drawer `showHandle` è true e lo stile è simile (da verificare visivamente), oppure
- perché l’area “handle” è generata/stilizzata altrove.
La nostra implementazione del handle è in `src/components/ui/drawer.tsx` (riga ~66): se `showHandle` è true, mostra una pill grigia.

---

## Modifiche previste (cosa cambierò)

### A) Rendere la mappa sempre visibile dietro la lista (fix #1)
**File:** `src/components/home/MapSection.tsx`

1) **Non nascondere più la mappa quando la lista è aperta**:
   - Cambiare:
     - da: `opacity-0 pointer-events-none`
     - a: solo `pointer-events-none` (oppure nessuna classe, ma consigliato: disabilitare interazione mentre drawer è aperto)
   - Risultato: la mappa resta renderizzata e visibile sotto il drawer (effetto “glass”).

2) (Opzionale ma consigliato) **Disabilitare lo “scale background” del vaul Drawer** per evitare che Vaul alteri il background della pagina (a volte fa sembrare “bianco/solido” dietro):
   - Passare al `<Drawer …>` di questa lista `shouldScaleBackground={false}`.
   - Questo aiuta anche a rispettare l’obiettivo “mappa dietro, bottom-nav sopra” senza artefatti.

---

### B) Ripristinare scroll verticale e layout stabile della lista (richiesta extra)
**File:** `src/components/home/MapSection.tsx`

Attualmente il drawer usa `max-h-[..vh]` senza un `overflow-hidden` esplicito sul container. Con `max-height` + contenuti sticky + scroll area, è facile perdere lo scroll “percepito” o ritrovarsi con layout che non vincola l’area scrollabile.

Intervento:
1) Cambiare la logica altezza da `max-h-[Xvh]` a **`h-[Xvh]`** (altezza “reale”, più prevedibile).
2) Aggiungere `overflow-hidden` su `DrawerContent` per garantire che lo scroll resti dentro lo `ScrollArea`.

Esempio (concetto):
- `className` DrawerContent include: `overflow-hidden`
- altezza dinamica:
  - `places.length <= 3 ? "h-[45vh]" : ... : "h-[85vh]"`

Questo mantiene “85vh” come massimo (come richiesto) ma rende il drawer più basso con pochi elementi, e garantisce scroll verticale quando serve.

---

### C) Ripristinare padding header (richiesta extra)
**File:** `src/components/home/MapSection.tsx`

Ora `DrawerHeader` è `pt-1 pb-2` e alcune righe hanno `-mt-1`.
Intervento:
- Aumentare padding in modo pulito e coerente, ad esempio:
  - `px-6 pt-3 pb-3` (o simile) e ridurre/annullare i negativi (`-mt-1`) se non necessari.
- Obiettivo: header più “respirato” senza creare uno “stacco” di background (lo manterremo uniforme).

---

### D) Avatar ring non tagliato (fix #2)
**File:** `src/components/home/ListDrawerSubFilters.tsx`

Sul contenitore scroll orizzontale:
- Cambiare classi:
  - da: `overflow-x-auto scrollbar-hide pt-2 pb-2`
  - a: `overflow-x-auto overflow-y-visible scrollbar-hide py-2`
In più, se necessario:
- Aggiungere un minimo padding laterale/verticale nel wrapper per evitare clipping nelle estremità.
- Verificare che anche il “All button” (con immagine friends) non venga tagliato quando ha ring.

---

### E) Rimuovere la barra grigia in alto (fix #3)
**File:** `src/components/home/MapSection.tsx` + (se serve) `src/components/ui/drawer.tsx`

1) Confermare che per il drawer “Posizioni”:
- `showHandle={false}` resti impostato (già lo è).

2) Se la barra grigia persistesse:
- Verificare se proviene da un’altra area (es. un div “handle area” aggiunto manualmente).
- In caso sia ancora il nostro handle, aggiungerò una protezione extra:
  - assicurare che non venga renderizzato alcun handle (già condizionale) e che non ci siano pseudo-elementi/spacing che lo “simulano”.
- Se invece è un “grip” visivo dovuto a qualche background/gradient/top spacing, lo eliminerò regolando padding/spacing in header/content (vedi punto C).

---

## Verifica (cosa controlleremo in preview)
1) Aprire “Posizioni”:
   - la mappa deve essere visibile dietro tutta la card/lista (effetto frosted).
2) Scorrere verticalmente la lista:
   - lo scroll deve funzionare con molti elementi.
3) Filtro “Amici”:
   - ring degli avatar e del pulsante “All” non deve essere tagliato in alto/basso.
4) Top drawer:
   - nessuna pill/grip bar grigia visibile.
5) Padding header:
   - titolo + filtri devono avere un padding piacevole e consistente.

---

## File coinvolti
- `src/components/home/MapSection.tsx`
  - non nascondere la mappa quando list open
  - shouldScaleBackground={false} per questo drawer
  - altezza dinamica con `h-[..vh]` e `overflow-hidden`
  - ripristino padding header
- `src/components/home/ListDrawerSubFilters.tsx`
  - `overflow-y-visible` + padding per evitare clipping del ring
- (solo se necessario) `src/components/ui/drawer.tsx`
  - eventuale ulteriore hardening per evitare che appaia un handle non voluto

---

## Note tecniche (perché questa soluzione funziona)
- Il problema principale della “mappa non visibile” non è l’opacità degli item, ma che la mappa viene resa trasparente (`opacity-0`). Togliendo quell’opacità, il drawer può finalmente “glassare” qualcosa.
- Usare un’altezza `h-[..vh]` invece di `max-h` rende più stabile lo scroll e la distribuzione `flex` (`ScrollArea` con `flex-1`).
- `overflow-y-visible` sul container degli avatar impedisce che ring/offset vengano tagliati dal box di scroll orizzontale.

