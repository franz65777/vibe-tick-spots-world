
Obiettivo: ripristinare (1) click/tap sui bottoni nel post aperto dal profilo e (2) “Posizioni Salvate” full-screen con vero vertical scroll (non “a metà”), senza regressioni su feed e altre overlay.

---

## 1) Diagnosi (da quello che vedo nel codice + screenshot)
### A) “Posizioni Salvate” si apre a metà + non scrolla
- `SavedLocationsList` è renderizzata **dentro** la pagina profilo (non in Portal).
- In più parti dell’app usate overlay/modali in Portal con z-index massimo (es. `PostDetailModalMobile`), proprio per evitare:
  - stacking context “strani”
  - contenitori parent con `overflow/transform` che possono “tagliare” un `fixed`
- Risultato tipico: overlay “fixed inset-0” che però sembra confinata e non copre tutto (esattamente quello che vedo nello screenshot: header profilo resta sopra).

### B) Bottoni del post (like/comment/share/pin) non cliccabili nel modal aperto dal profilo
- `PostDetailModalMobile` è già in Portal e con z-index altissimo, quindi **non è un problema di essere “dietro” al profilo**.
- Quando un’UI è visibile ma “non cliccabile”, quasi sempre c’è:
  1) un layer trasparente sopra (overlay/pseudo-element) che intercetta i click
  2) un contenitore con `pointer-events`/stacking/`isolation` che fa sì che l’area cliccabile non riceva eventi
- Nel vostro caso, i candidati più probabili sono:
  - qualche wrapper del modal che finisce con un layer “sopra” (anche solo per alcune sezioni)
  - oppure elementi “sticky/absolute” con z-index più alto del previsto che coprono la zona actions

Per risolvere senza “tentativi a caso”, propongo una correzione strutturale + una piccola strumentazione di debug (temporanea) per confermare che gli eventi arrivino davvero.

---

## 2) Interventi (implementazione)

### 2.1 Fix definitivo “Posizioni Salvate”: usare Portal + layout standard overlay
Modifiche in `src/components/profile/SavedLocationsList.tsx`:

1) **Render in Portal** come fate per `PostDetailModalMobile`:
   - `return createPortal(..., document.body)`
   - z-index “massimo” (2147483647) invece di 9999
2) **Struttura overlay standard**:
   - Root: `fixed inset-0 h-[100dvh] flex flex-col overflow-hidden`
   - Background: `FrostedGlassBackground` in `fixed` e `pointer-events-none`
   - Content wrapper: `relative z-10 flex flex-col h-full min-h-0`
   - Scroll container unico: `flex-1 min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch]`
3) **Rimuovere offset che possono farla sembrare “a metà”**:
   - Togliere `mt-2.5` dal blocco header (o almeno spostarlo in padding interno controllato), perché in overlay full-screen non deve “scivolare” verso il basso.
4) (Opzionale ma consigliato) **mettere `touch-action: pan-y`** sullo scroll container, per rendere lo scroll più affidabile anche con gesture handler presenti altrove.

Risultato atteso:
- la pagina SavedLocations copre davvero tutto lo schermo
- lo scroll verticale sulle card funziona sempre (desktop incluso)
- non resta “dietro” al profilo e non viene “clippata”

---

### 2.2 Fix click bottoni nel PostDetailModalMobile: garantire che le actions stiano sopra ogni layer
Modifiche in `src/components/explore/PostDetailModalMobile.tsx`:

1) **Forzare un contesto pulito** sul root del modal:
   - aggiungere `isolation: isolate` (Tailwind: `isolate`) sul contenitore `fixed inset-0 ...`
   - questo evita che z-index “strani” di discendenti/stacking si comportino in modo inatteso
2) **Forzare clickability nella zona actions**:
   - wrappare il blocco `<PostActions ... />` in un contenitore con:
     - `relative z-20 pointer-events-auto`
   - e assicurarsi che eventuali overlay/dots/carousel rimangano a z-index più basso
3) **Rendere lo scroll container esplicitamente “interattivo”**:
   - aggiungere `pointer-events-auto` sul `div ref={scrollContainerRef}`
   - (di solito non serve, ma aiuta a neutralizzare casi in cui un parent o una regola globale lo renda non interattivo)

---

### 2.3 Debug mirato (temporaneo) per confermare il layer che intercetta i click
Per evitare altri “giri a vuoto”, aggiungerò (temporaneamente) nel modal:
- un `onClickCapture` sul root del modal che fa `console.log('modal click', (e.target as HTMLElement).tagName, (e.target as HTMLElement).className)`
- e un `onPointerDownCapture` nella zona actions

Se vediamo log quando clicchi sul modal ma NON quando clicchi sui bottoni, significa che c’è davvero un layer sopra i bottoni che intercetta. A quel punto lo individuiamo con certezza (spesso è un `absolute` full-size con `z-*`).

Nota: dopo conferma e fix, rimuoverò i log.

---

## 3) Test di accettazione (checklist)
### Saved Locations
- Apri “Posizioni Salvate” dal profilo: deve coprire l’intero viewport (nessuna parte del profilo visibile sopra/sotto).
- Scroll verticale: riesci a scendere fino in fondo alle card su desktop.
- Filtri orizzontali: restano su una riga e non “rompono” lo scroll verticale.

### Post modal da profilo
- Apri un post dal profilo (tuo e di altri utenti):
  - cuore cliccabile (cambia stato)
  - commenti apre drawer
  - share apre modal share
  - pin apre dropdown / remove confirm
- Verifica anche che lo scroll del modal continui a funzionare.

---

## 4) File coinvolti
- `src/components/profile/SavedLocationsList.tsx` (Portal + layout/scroll fix)
- `src/components/explore/PostDetailModalMobile.tsx` (isolation + z-index/pointer-events fix + debug temporaneo)

---

## 5) Rischi / attenzione
- Portare `SavedLocationsList` in Portal può cambiare leggermente la gestione del “back”/chiusura se ci sono listener sul parent: verificherò che `onClose` continui a funzionare identico.
- Z-index altissimo: useremo lo standard già adottato (`2147483647`) per coerenza con gli altri modal critici.
