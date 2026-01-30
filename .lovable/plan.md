
# Piano: Fix count aggiornamento e persistenza utenti unfollowed

## Problema identificato

### 1. Count non aggiornato correttamente
Attualmente il `followingCount` è gestito come state locale (`useState`) che viene sincronizzato con `following.length` al mount e dopo ogni caricamento. Ma:
- Quando fai unfollow, il count locale viene decrementato
- Quando riapri il modal, il count viene ricalcolato da `following.length` che include ancora l'utente (perché non è stato rimosso dalla cache)

### 2. Utente unfollowed riappare dopo chiusura
La funzione `unfollowUserKeepInList` aggiorna solo `isFollowing: false` nella cache, ma non rimuove l'utente. Il design voleva che l'utente restasse visibile per permettere il re-follow immediato, ma questo crea confusione alla riapertura.

## Soluzione proposta

### A. Tracciare gli utenti "unfollowed" localmente
Aggiungere uno state `unfollowedIds: Set<string>` che tiene traccia degli ID unfollowed durante la sessione del modal. Questi utenti:
- Rimangono visibili nella lista (per re-follow immediato)
- Vengono esclusi dal count
- Alla chiusura del modal, vengono rimossi dalla cache React Query

### B. Sincronizzare cache alla chiusura del modal
Nel `onClose` del modal:
1. Rimuovere dalla cache tutti gli utenti in `unfollowedIds`
2. Questo garantisce che alla riapertura non riappaiano

### C. Derivare il count dalla lista filtrata
Invece di usare `following.length` direttamente:
- Count = `following.filter(u => !unfollowedIds.has(u.id)).length`
- Questo rende il count sempre coerente con lo stato visuale

## Implementazione dettagliata

### 1. Aggiungere state per tracking unfollowed (FollowersModal.tsx)
```tsx
const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(new Set());
```

### 2. Modificare unfollowUserKeepInList
Quando si fa unfollow:
- Aggiungere l'ID a `unfollowedIds`
- NON decrementare manualmente `setFollowingCount` (verrà calcolato)

### 3. Modificare followUser (re-follow)
Quando si fa re-follow:
- Rimuovere l'ID da `unfollowedIds`

### 4. Derivare count dinamicamente
```tsx
const effectiveFollowingCount = following.filter(u => !unfollowedIds.has(u.id)).length;
```
Usare `effectiveFollowingCount` nel render del pill tab.

### 5. Cleanup alla chiusura del modal
Modificare `onClose` per:
1. Rimuovere dalla cache React Query gli utenti unfollowed
2. Resettare `unfollowedIds`

```tsx
const handleClose = useCallback(() => {
  // Rimuovi dalla cache gli utenti unfollowed
  if (unfollowedIds.size > 0) {
    queryClient.setQueryData<FollowUser[]>(
      ['follow-list', targetUserId, 'following'],
      (old) => old?.filter(u => !unfollowedIds.has(u.id))
    );
    setUnfollowedIds(new Set());
  }
  onClose();
}, [unfollowedIds, queryClient, targetUserId, onClose]);
```

### 6. Aggiornare anche la lista filtrata per display
Opzionalmente, nella griglia mostrare un indicatore visivo (es. opacità ridotta) per gli utenti unfollowed, o semplicemente mostrarli normalmente con il pulsante "+" per re-follow.

## File coinvolti
- `src/components/profile/FollowersModal.tsx`

## Checklist verifica
- [ ] Smetti di seguire un utente -> il count nel pill tab si aggiorna immediatamente (es. 7 -> 6)
- [ ] L'utente resta nella lista con icona "+" per re-follow
- [ ] Chiudi il modal -> riapri -> l'utente unfollowed NON compare più
- [ ] Re-follow un utente -> count torna a +1
- [ ] Nessun flash/reload degli avatar durante queste operazioni
