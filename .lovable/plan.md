
# Piano: Invalidare la cache follow-list quando si segue una nuova persona

## Problema
Quando l'utente segue una nuova persona da:
- `ExplorePage` (handleFollowUser)
- `UserProfilePage` (followUser via useUserProfile)
- `NotificationItem` (handleFollowClick)
- Altri componenti

La cache React Query per `['follow-list', userId, 'following']` non viene invalidata. Quindi quando l'utente apre il `FollowersModal`, vede ancora la lista vecchia (7 seguiti invece di 8) perché la cache è ancora valida (staleTime: 60 secondi).

## Soluzione

### Strategia: Invalidare la cache dopo ogni follow
Quando l'utente corrente segue qualcuno, invalidare la cache `['follow-list', currentUserId, 'following']` in modo che alla prossima apertura del modal venga ricaricata la lista aggiornata.

### Implementazione

**1. Creare una utility centralizzata per invalidare la cache follow-list**

Aggiungere una funzione esportata in `useFollowList.ts`:

```typescript
export const invalidateFollowList = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  type: 'followers' | 'following'
) => {
  queryClient.invalidateQueries({ queryKey: ['follow-list', userId, type] });
};
```

**2. Invalidare la cache in `useUserProfile.ts` dopo followUser**

Nel metodo `followUser()` di `useUserProfile.ts`, dopo il successo dell'inserimento del follow:
- Importare `queryClient` 
- Chiamare `invalidateFollowList(queryClient, currentUser.id, 'following')`

Questo garantisce che quando l'utente torna al proprio profilo e apre il modal "Seguiti", la lista venga ricaricata.

**3. Invalidare la cache in `ExplorePage.tsx` dopo handleFollowUser**

Nel metodo `handleFollowUser()`, dopo il toggle del follow:
- Se è un nuovo follow (non esistente prima), invalidare `['follow-list', currentUser.id, 'following']`

**4. Considerare altri punti di follow**
Verificare e aggiungere invalidation anche in:
- `NotificationItem` (handleFollowClick)
- `ContactsFoundView` (handleFollow)
- `LikersDrawer` (handleFollowToggle)

### Dettagli tecnici

**File da modificare:**
1. `src/hooks/useFollowList.ts` - Aggiungere export della funzione `invalidateFollowList`
2. `src/hooks/useUserProfile.ts` - Chiamare invalidazione dopo follow
3. `src/components/ExplorePage.tsx` - Chiamare invalidazione dopo follow
4. `src/components/notifications/MobileNotificationItem.tsx` - Chiamare invalidazione dopo follow
5. `src/components/notifications/ContactsFoundView.tsx` - Chiamare invalidazione dopo follow
6. `src/components/social/LikersDrawer.tsx` - Chiamare invalidazione dopo follow

### Flusso dopo la modifica

```text
1. Utente segue @newuser dalla UserProfilePage
2. useUserProfile.followUser() → DB insert → successo
3. Chiama invalidateFollowList(queryClient, currentUser.id, 'following')
4. La cache viene marcata come stale
5. Utente torna al proprio profilo → apre modal "Seguiti"
6. React Query rileva che la cache è stale → ricarica la lista
7. @newuser appare subito nella lista
```

### Alternativa considerata (scartata)
Potrei anche aggiungere il nuovo utente direttamente alla cache (optimistic update), ma:
- Richiede conoscere tutti i dati del profilo (avatar, username, savedPlacesCount, etc.)
- È più complesso e soggetto a errori
- L'invalidazione è più semplice e affidabile

### Checklist verifica
- [ ] Segui un utente da ExplorePage → apri modal seguiti → l'utente appare
- [ ] Segui un utente da UserProfilePage → apri modal seguiti → l'utente appare  
- [ ] Segui un utente da notifiche → apri modal seguiti → l'utente appare
- [ ] Il count nel pill tab è corretto
- [ ] Nessun flash eccessivo durante il reload (la lista viene ricaricata solo se necessario)
