
Obiettivo (richieste utente)
1) Eliminare completamente l’effetto “reload/ricaricamento” degli avatar dopo click su “Smetti di seguire” e altre azioni nel modal Followers/Following.
2) Rendere i bottoni azione (tick / X / + / clock) più belli e spostarli in alto a sinistra dell’avatar, così da non coprire la chip del count luoghi.

Cosa ho trovato (root cause reale del “reload”)
Nel file `src/components/profile/FollowersModal.tsx`:
- `UserGridCard` è definito DENTRO il componente `FollowersModal` (vedi righe ~343+).
- `TabGridContent` è definito DENTRO `FollowersModal` (righe ~495+).

In React, quando usi un componente definito inline (cioè una function component dichiarata dentro un altro component), il suo “tipo” cambia ad ogni render del parent (perché è una nuova funzione). Risultato:
- React tende a smontare e rimontare i figli (o comunque perde stabilità di identity), e questo fa “ripartire” `AvatarImage` → l’immagine viene richiesta/ri-renderizzata e l’utente percepisce il “reload”.
- La mia modifica precedente (animazione one-shot) non poteva risolvere questo problema perché il remount fa ripartire tutto comunque.

Quindi il fix corretto è: stabilizzare l’identità dei componenti spostandoli fuori da `FollowersModal`.

Soluzione tecnica (high level)
A) Stabilizzare componenti: spostare `UserGridCard` e `TabGridContent` a livello di modulo (top-level), fuori da `FollowersModal`.
B) Ridurre re-render inutili: usare `React.memo` su `UserGridCard` (e opzionalmente su `TabGridContent`) per evitare re-render quando cambiano state non pertinenti alla singola card.
C) Spostare e rifinire i bottoni azione: posizionarli `top-1 left-1` (o `top-1.5 left-1.5`) con stile glass pulito, dimensioni coerenti, ring/border leggeri e icona centrata.
D) Garantire che la chip 📌 rimanga “libera”: lasciarla in basso (come ora) e assicurarsi che z-index e posizionamento non confliggano con l’action button.

Dettaglio implementazione (passi ordinati)

1) Refactor: estrarre `UserGridCard` fuori da `FollowersModal`
- Creare (nello stesso file) una definizione top-level, ad esempio:
  - `type UserGridCardProps = { user, index, ...handlersAndState }`
- Passare come props tutto ciò che oggi `UserGridCard` legge da closure:
  - `stories`, `onAvatarClick` (o `handleAvatarClick`), `onActionClick` (o `handleActionClick`)
  - `isOwnProfile`, `activeTab`, `currentUserId`, `t`
  - `getInitials`
- Nota: l’animazione “fadeIn” potrà rimanere (hasAnimatedRef) e finalmente funzionerà davvero “one-shot”, perché la card non verrà rimontata ad ogni azione.

2) Refactor: estrarre `TabGridContent` fuori da `FollowersModal`
- Anche `TabGridContent` oggi è inline e cambia identity ad ogni render.
- Estrarlo top-level e passare:
  - `tabType`, `activeTab`, `filteredUsers`, `tabLoading`, `searchQuery`, `t`
- In questo modo, quando fai follow/unfollow, React non ricrea “nuovi componenti” per tutta la griglia, riducendo drasticamente remount/reload.

3) Hardening: usare `React.memo` su `UserGridCard`
- Wrappare `UserGridCard` con `memo` e (se serve) una `areEqual` custom che confronta solo i campi che cambiano davvero per la singola card:
  - `user.id`, `user.avatar_url`, `user.username`, `user.isFollowing`, `user.followRequestPending`, `user.savedPlacesCount`, `user.isPrivate`
  - `index` (se lo usiamo per animationDelay)
- Obiettivo: se cambi lo stato di 1 card, le altre non devono ri-renderizzare e soprattutto non devono “refreshare” AvatarImage.

4) Fix UI: spostare action button in alto a sinistra e renderlo “più bello”
- Modifica markup nella card:
  - Oggi l’action button è `absolute -bottom-0.5 -right-0.5 ...` → spostarlo a:
    - `absolute top-1 left-1` (o `top-1.5 left-1.5`)
- Stile consigliato (glassmorphism pulito, coerente con il resto app):
  - `w-7 h-7` (un po’ più grande e tappabile)
  - `rounded-full`
  - `backdrop-blur-md`
  - `bg-white/80 dark:bg-black/35`
  - `border border-white/40 dark:border-white/15`
  - `shadow-sm`
  - `ring-1 ring-black/5 dark:ring-white/10` (molto leggero)
  - Hover/active: `hover:bg-white/90 dark:hover:bg-black/45 active:scale-95 transition`
- Colore icona:
  - Invece di colorare lo sfondo (verde/rosso/primary) che risulta “pesante”, rendere il background neutro (glass) e colorare l’icona:
    - unfollow (Check): `text-emerald-500`
    - remove follower (X): `text-rose-500`
    - follow (UserPlus): `text-foreground` o `text-primary`
    - pending (Clock): `text-amber-500`
- Questo dà l’effetto “più premium” e pulito, e aumenta la leggibilità su foto/avatar.

5) Verificare che la chip 📌 non venga coperta
- La chip è `absolute -bottom-1 left-1/2 ...` quindi non confligge più con top-left.
- Verificare z-index:
  - Action button `z-20`
  - Chip `z-10`
- Così l’action button non copre la chip e viceversa.

6) Verifica end-to-end (obbligatoria)
- Apri /profile → FollowersModal → tab “seguiti”:
  - Tap ✓ (unfollow): nessun flash/ricaricamento avatar, solo cambio icona a “+”.
  - Tap + (follow): nessun flash, cambio a ✓ (o clock se privato).
- Tab “follower”:
  - Tap X → conferma: rimozione senza che gli altri avatar flashino.
- Controllare su mobile (iOS/Android) perché il reload era molto percepibile lì.

File coinvolti
- `src/components/profile/FollowersModal.tsx` (refactor strutturale + restyle bottoni)

Rischi / note
- Questo refactor è strutturale ma a basso rischio funzionale: non cambia logica supabase/react-query, cambia identità dei componenti e UI.
- È la causa più probabile del “non vedo nessuna modifica” percepita: le modifiche precedenti agivano sull’animazione, ma il remount dei componenti rendeva l’effetto comunque presente. Con questo cambio, l’avatar non dovrebbe più “refreshare”.

Criteri di accettazione
- Dopo un follow/unfollow/remove:
  - nessun avatar “sparisce e ricompare”
  - nessun effetto di reload percepibile
  - action button visivamente più bello, in alto a sinistra, e non copre la chip 📌