
Obiettivo
- Eliminare completamente l’effetto “reload / caricamento” degli avatar dopo click su “Smetti di seguire” e altre azioni nel modal Followers/Following.
- Migliorare la “chip” con il count dei luoghi: aggiungere emoji 📌 accanto al numero e sostituire il blu con un glass effect più pulito.

Diagnosi (perché succede il “reload”)
- In `src/components/profile/FollowersModal.tsx`, dentro `UserGridCard` ogni card ha uno style inline che imposta SEMPRE:
  - `opacity: 0`
  - `animation: 'fadeIn 0.2s ... forwards'`
- Quando fai follow/unfollow, vengono aggiornati degli state (es. `followingCount`, `confirmDialog`, oppure i dati in cache via `setQueryData`) → il componente re-renderizza → quello style viene ri-applicato → l’animazione riparte e la card torna per un frame a opacity 0.
- Questo “flash” visivo sembra un “reload degli avatar” / “ulteriore load”, anche se in realtà è un re-render con animazione che riparte.

Soluzione UX (senza cambiare il comportamento dati)
1) Rendere l’animazione “fadeIn” one-shot (solo al mount), non ad ogni re-render
- Modifica `UserGridCard` in `FollowersModal.tsx`:
  - Rimuovere `opacity: 0` e `animation: ...` dagli style inline applicati ad ogni render.
  - Implementare una di queste strategie (scegliamo la più semplice e robusta):
    A. Animazione solo su mount con `useRef`/`useState`:
       - `const didAnimateRef = useRef(false)`
       - Alla prima render (mount) applichi class/style “animate”, poi setti `didAnimateRef.current = true`
       - Alle render successive, niente opacity 0 / niente animation.
    B. Alternativa: animare solo quando la lista cambia “davvero” (non quando cambia isFollowing)
       - Però qui le liste cambiano spesso per l’optimistic update, quindi A è più stabile.

Risultato atteso:
- Dopo unfollow/follow/remove follower, l’overlay icon cambia (✓ / + / ⏱ / X) senza che la card sparisca e ricompaia.
- Nessun “flash” che dà l’idea di caricamento.

2) Evitare micro-remount non necessari (hardening)
- Verificare che `key={user.id}` resti (già ok) e che non venga cambiata.
- Assicurarsi che `avatarUrl` non passi da string → undefined durante le azioni (attualmente è `user.avatar_url || undefined`, ok).
- Non mostrare skeleton durante refetch (già non dovremmo perché usiamo `isLoading`; ma se esiste logica che usa `isFetching` in futuro, tenere la regola: skeleton solo se non ho dati).

Miglioria “chips” count luoghi (📌 + glass effect)
Contesto attuale:
- In `FollowersModal.tsx` la badge è qui:
  - `/* Places badge - bottom center */`
  - Usa `bg-primary` + `MapPin` + numero.

Modifiche richieste:
1) Sostituire l’icona con emoji:
- Mostrare: `📌 {count}`
- Rimuovere `MapPin` per avere un look più “clean” (come richiesto).

2) Sostituire il blu con un glass effect:
- Aggiornare className della badge verso un glassmorphism pulito, ad esempio:
  - `bg-white/70 dark:bg-white/10 backdrop-blur-md`
  - `border border-white/40 dark:border-white/15`
  - `text-foreground` (o `text-slate-900 dark:text-white`)
  - `shadow-sm` (molto leggero)
- Mantenere compatto il font (`text-[10px]`) ma con migliore leggibilità.

3) Rifinire spacing e allineamento:
- `flex items-center gap-1 px-2 py-0.5 rounded-full`
- Mettere l’emoji in `span` con `leading-none` per allineare verticalmente.

File toccati
- `src/components/profile/FollowersModal.tsx`
  - Fix “avatar reload” (animazione fade-in solo al mount)
  - Restyle badge places count (📌 + glass effect)

Piano di implementazione (passi)
1) Intervenire su `UserGridCard`:
   - Rimuovere `opacity: 0` e `animation: fadeIn ...` dallo style applicato sempre.
   - Aggiungere stato/ref “animatedOnce” per applicare l’animazione solo la prima volta.
   - Verificare che lo scroll e l’Embla carousel non re-montino inutilmente le card durante le azioni.

2) Aggiornare la “places badge”:
   - Cambiare markup: sostituire `MapPin` con emoji 📌.
   - Aggiornare className a glass effect.
   - Verificare contrasto in dark mode.

3) Verifica manuale end-to-end (checklist)
   - Apri Profile → FollowersModal → tab “Seguiti”:
     - Click ✓ (unfollow) su profilo pubblico: nessun flash/ricaricamento avatar, solo cambio icona a +.
     - Click + (follow) su pubblico: nessun flash, solo cambio icona.
     - Su privato: conferma unfollow; poi click +: deve diventare ⏱ (pending) senza flash.
   - Tab “Follower”:
     - Click X → dialog → conferma: rimozione senza flash sugli altri avatar.
   - Controllare che la chip 📌 appaia correttamente e che non sia blu (glass).

Note tecniche / rischi
- Se il “reload” percepito fosse anche fuori dal modal (es. ProfileHeader), allora faremo una seconda passata mirata su quel componente. Ma i sintomi descritti combaciano perfettamente con la re-animazione delle card (opacity 0 + animation sempre attiva).
- Il fix proposto non tocca Supabase/React Query: è puramente UI/UX e quindi a basso rischio.

Output atteso
- Zero “flash”/reload degli avatar dopo azioni.
- Badge count luoghi con `📌` e glass effect pulito.