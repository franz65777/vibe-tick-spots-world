
## Obiettivo
Mostrare ovunque il logo SPOTT corretto (quello del file `user-uploads://image-1769767572.png`) con trasparenza e qualità alta, eliminando il “rettangolo bianco” che stai vedendo.

## Cosa ho verificato (dai file)
- Il progetto usa **solo** `src/assets/spott-logo-transparent.png` in:
  - `src/components/home/SearchDrawer.tsx`
  - `src/components/notifications/InviteFriendOverlay.tsx`
- L’immagine attualmente in `src/assets/spott-logo-transparent.png` (quella che il build sta servendo) **ha effettivamente uno sfondo bianco**: quindi il problema non è solo “cache”, è anche che l’asset in repo non corrisponde al tuo file trasparente.

## Piano di intervento

### 1) Sostituzione asset (corretta e definitiva)
- Copiare **esattamente** il file che hai caricato (trasparente e HQ):
  - `user-uploads://image-1769767572.png` → `src/assets/spott-logo-transparent.png` (sovrascrittura)

Motivo: i componenti importano già quel percorso, quindi sostituendo il file si aggiorna ovunque senza toccare codice UI.

### 2) Eliminare il rischio “vedo ancora quello vecchio” (cache busting)
Dato che hai già visto più volte “sempre lo stesso”, aggiungo una misura anti-cache a livello di build:
- Rinominare l’asset in modo univoco, ad esempio:
  - `src/assets/spott-logo-transparent.png` → `src/assets/spott-logo-transparent-v2.png`
- Aggiornare gli import nei 2 componenti:
  - `SearchDrawer.tsx`: import del nuovo filename
  - `InviteFriendOverlay.tsx`: import del nuovo filename

Motivo: anche se Vite di solito “hasha” gli asset, in alcune condizioni (preview, service worker/PWA, caching aggressivo del device) cambiare nome è il modo più sicuro per forzare l’aggiornamento immediato.

### 3) Verifica in UI (rapida, visiva)
- Aprire Home (`/`) e controllare:
  - logo nella search bar (quello piccolo in alto)
- Aprire “Invite a Friend” e controllare:
  - logo grande nella card

Cosa deve risultare:
- Stesso logo “Spott” collage
- Nessun background “disegnato” dentro l’immagine (trasparenza reale)

### 4) Nota importante: differenza tra “sfondo dell’immagine” e “sfondo della card”
Nel tuo screenshot “sbagliato” si vede un riquadro bianco dietro al logo: quello può essere:
- **A)** parte dell’immagine (problema asset) → lo risolviamo con la sostituzione corretta
- **B)** semplicemente lo sfondo della UI (la card è bianca in light mode) → in questo caso il logo è trasparente ma appoggiato su una card bianca (che è normale)

Per distinguere A vs B dopo la fix:
- Se vedi ancora un rettangolo bianco “staccato” attorno al logo anche su sfondo scuro, allora era A.
- Se su card bianca sembra “su bianco” ma su sfondo scuro si integra perfettamente, allora era B (comportamento corretto).

## Modifiche previste (riassunto)
- Sostituzione file asset con quello corretto e trasparente
- (Se necessario per evitare cache) rinomina file + aggiornamento import in:
  - `src/components/home/SearchDrawer.tsx`
  - `src/components/notifications/InviteFriendOverlay.tsx`

## Rischi / Edge cases gestiti
- Caching aggressivo: mitigato rinominando l’asset (soluzione più affidabile).
- Trasparenza: garantita usando il tuo PNG originale (non “ritagliato”/ricreato).

