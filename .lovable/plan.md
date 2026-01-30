
Obiettivo (immediato)
- Sistemare il “Salva” nella Add page: oggi fallisce (quindi non chiude) perché l’insert in `folder_locations` viene bloccato da RLS.
- Far comparire le immagini “autogenerate” (come Torino) ovunque: sia nella Add flow (lista selezione) sia nelle card liste del profilo.
- Migliorare la UI delle card liste (meno “bianco”, più “card-like” e leggibile).

Contesto (debug già trovato)
- Nei console logs compare: `new row violates row-level security policy (USING expression) for table "folder_locations"`.
  Questo spiega perfettamente:
  1) “Il salvataggio non funziona”
  2) “Il tasto salva non fa chiudere la pagina add” (perché va in catch e non arriva al close).

------------------------------------------------------------
1) Fix SALVATAGGIO Add Page (RLS su folder_locations)
Cosa fare
A. Verificare configurazione RLS su `folder_locations`
- Se RLS è ON (lo è, visto l’errore), dobbiamo aggiungere policy per:
  - INSERT (per aggiungere una location a una cartella)
  - SELECT (per poter leggere righe quando serve)
  - DELETE (per rimuovere una location da una cartella, se previsto)
  - (eventuale UPDATE se in futuro serve; oggi usiamo upsert)

B. Creare policy “solo proprietario cartella”
- Consentire insert/select/delete su `folder_locations` solo se la cartella (`saved_folders.id = folder_locations.folder_id`) appartiene a `auth.uid()`.

SQL (indicativo, da mettere in migration)
- Abilitazione RLS (se non già abilitata)
- Policy INSERT:
  - WITH CHECK: EXISTS saved_folders WHERE saved_folders.id = folder_locations.folder_id AND saved_folders.user_id = auth.uid()
- Policy SELECT:
  - USING: EXISTS saved_folders ... stesso controllo
- Policy DELETE:
  - USING: EXISTS saved_folders ... stesso controllo

Risultato atteso
- `upsert(folder_locations)` dal `LocationContributionModal` non fallisce più.
- Al click su “Salva”:
  - la location viene realmente aggiunta alla lista
  - la modal si chiude
  - l’utente torna alla mappa (il close-add-overlay event rimane ok)

Nota importante
- Dopo questo fix, il comportamento “chiudi la pagina dopo Salva” funzionerà automaticamente, perché oggi non ci arriva mai al “success path” (va in catch).

------------------------------------------------------------
2) Fix IMMAGINI liste autogenerate (Torino non mostra cover)
Perché succede oggi
- Nel profilo (`useOptimizedFolders`) la cover viene calcolata come:
  - folder.cover_image_url || firstLoc.image_url || null
- Ma per molte location “autogenerate”:
  - `locations.image_url` è null
  - le foto sono in `locations.photos` (array di URL in storage)
- Quindi la cover resta null e viene mostrato il gradiente.

Soluzione (backend read + mapping)
A. Aggiornare `useOptimizedFolders`
- Quando carichiamo le locations, includere anche `photos`:
  - `select('id, category, image_url, photos')`
- Implementare una piccola funzione helper (o riusare lo stesso pattern già usato altrove) per estrarre “prima foto” da `photos`.
- Impostare cover così:
  - `cover_image_url: folder.cover_image_url || firstLoc.image_url || extractFirstPhotoUrl(firstLoc.photos) || null`
- Fare lo stesso anche per `savedFolders` (le liste salvate di altri utenti), perché usano la stessa logica.

B. Aggiornare anche `LocationContributionModal` (lista selezione cartelle)
- Attualmente tenta una join `folder_locations -> locations(...)` che probabilmente non funziona (nel typegen non c’è la relationship verso `locations`).
- Convertire la logica in “batch query” (più efficiente e affidabile):
  1) carico tutte le cartelle (saved_folders)
  2) carico tutte le `folder_locations` per quei folder_id (già lo facciamo per count/hasLocation in modo N+1: lo miglioreremo)
  3) prendo un location_id “preview” per cartella (prima location)
  4) faccio una query `locations` con `in(locationIds)` e prendo `image_url, photos`
  5) calcolo `cover_url` come sopra

Risultato atteso
- Torino (e simili) mostrerà una foto reale (presa da `locations.photos[0]`) invece del gradiente, sia:
  - nella selezione liste della Add flow
  - nelle card liste del profilo
  - in eventuali altri punti che usano `useOptimizedFolders`

------------------------------------------------------------
3) “Salva” deve chiudere davvero la pagina Add (UX)
Cosa fare (oltre al fix RLS)
- Mantenere l’attuale comportamento nel `LocationContributionModal`:
  - `onClose()` per chiudere la contribution modal
  - dispatch `close-add-overlay` per chiudere Add overlay (anche se spesso è già chiusa)
- Aggiungere un feedback più chiaro in caso di errore:
  - se fallisce l’upsert, mostrare toast specifico: “Non posso salvare in questa lista” (utile se RLS o altro torna a fallire)
- (Opzionale) Dopo l’upsert, triggerare un invalidation/refresh locale delle liste per far vedere subito i check, ma non è indispensabile se l’overlay si chiude.

------------------------------------------------------------
4) Migliorare look delle “card liste” (meno spazio bianco)
Dove intervenire
- Le card liste nel profilo sembrano essere in `src/components/profile/TripsGrid.tsx` (row “My Lists” / “Saved Lists”).
- Dallo screenshot e dal codice attuale, il “bianco” percepito può essere:
  - overlay inferiore con padding alto (pt-12) che “mangia” area immagine
  - testo/meta poco denso e con spazi generosi
  - shadow e rounding ok ma composizione migliorabile

Interventi UI proposti (senza cambiare layout generale)
- Ridurre la fascia overlay:
  - diminuire `pt-12` a qualcosa tipo `pt-8` o `pt-6`
  - usare overlay più “pulito”: gradient + blur leggero ma meno alto
- Rendere il titolo più leggibile e compatto:
  - mantenere 2 righe ma ridurre leading e padding
- Aggiungere micro-badge sopra immagine (opzionale):
  - conteggio luoghi (pill piccola)
  - privacy icon già presente, ok, ma possiamo allinearla meglio
- Uniformare copertine:
  - garantire `object-cover`
  - placeholder gradiente coerente quando manca immagine

Risultato atteso
- Card più “piene”, meno “vuoto” e più simili a quelle “best night out in dublin” come stile di densità (immagine protagonista, overlay testo compatto).

------------------------------------------------------------
5) Test end-to-end (obbligatorio)
Scenario da testare (flow completo)
1) Apri Add overlay → scegli un luogo
2) Seleziona una lista
3) Premi “Salva”
Atteso:
- niente errori in console
- la modal si chiude e torni alla mappa
- riaprendo la lista dal profilo o da dove preferisci, la location è presente
4) Verifica copertina lista Torino:
- deve mostrare una foto reale (da `locations.photos`) e non il gradiente

------------------------------------------------------------
File coinvolti (previsti)
- Database / Supabase migrations:
  - Nuova migration per RLS policies su `folder_locations`
- Frontend:
  - `src/hooks/useOptimizedFolders.ts` (cover fallback usando `photos`)
  - `src/components/explore/LocationContributionModal.tsx` (fetch cover/list batch + stop join non funzionante)
  - `src/components/profile/TripsGrid.tsx` (ritocco UI card liste)

Rischi / Edge cases
- Se alcune locations hanno `photos` non come array di stringhe: gestire anche array di oggetti con `.url` (pattern già usato in altre parti).
- Se `folder_locations` non ha unique constraint su (folder_id, location_id), l’upsert potrebbe non comportarsi come atteso. Oggi non risulta l’errore, ma se necessario:
  - aggiungere unique constraint in migration.
- Performance: la logica attuale in LocationContributionModal fa molte query (N+1). Il refactor batch ridurrà drasticamente le chiamate e renderà l’UI più reattiva.

Criteri di completamento
- Nessun errore RLS in console quando salvo in lista.
- Salvataggio effettivo in lista verificabile riaprendo la lista.
- Dopo “Salva” si torna sempre alla mappa.
- Torino (e liste autogenerate) mostrano copertina foto invece del gradiente.
- Card liste profilo con overlay più compatto e meno bianco.
