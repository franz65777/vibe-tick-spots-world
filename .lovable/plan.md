

# Piano: Correzione UX Reload su Unfollow

## Problema Identificato

Quando si clicca su "smetti di seguire" (unfollow), avviene questo flusso:

1. **Optimistic update** → UI aggiornata istantaneamente (✓)
2. **Query al database** → Dati salvati (✓)
3. **`queryClient.invalidateQueries()`** → **PROBLEMA**: forza un refetch completo dei dati
4. **Loading state** → La lista mostra lo skeleton/spinner mentre ricarica
5. **Dati ricaricati** → La lista riappare

Il problema è la chiamata a `invalidateQueries()` dopo ogni operazione, che annulla il beneficio dell'optimistic update.

## Posizioni del Problema nel Codice

```tsx
// Linea 201 - followUser
queryClient.invalidateQueries({ queryKey: ['follow-list'] });

// Linea 285 - removeFollower  
queryClient.invalidateQueries({ queryKey: ['follow-list'] });
```

La funzione `unfollowUserKeepInList` (linea 209-235) **NON** chiama `invalidateQueries` ed è corretta. Però le altre funzioni lo fanno.

## Soluzione

### 1. Rimuovere `invalidateQueries` dalle operazioni dirette

Le operazioni follow/unfollow/remove già fanno optimistic updates. Non serve invalidare la cache immediatamente.

```tsx
// Prima (followUser, linea 199-201):
} else {
  onFollowChange?.();
  queryClient.invalidateQueries({ queryKey: ['follow-list'] });
}

// Dopo:
} else {
  onFollowChange?.();
  // Non invalidare - l'optimistic update è sufficiente
  // Il refetch avverrà automaticamente quando staleTime scade
}
```

### 2. Rimuovere `invalidateQueries` da `removeFollower`

```tsx
// Prima (linea 282-285):
if (!error) {
  removeFollowerFromList(followerId);
  setFollowersCount(prev => Math.max(0, prev - 1));
  onFollowChange?.();
  queryClient.invalidateQueries({ queryKey: ['follow-list'] });
}

// Dopo:
if (!error) {
  removeFollowerFromList(followerId);
  setFollowersCount(prev => Math.max(0, prev - 1));
  onFollowChange?.();
  // Optimistic update già fatto con removeFollowerFromList
}
```

### 3. Aggiungere `updateFollowingStatus` per aggiornare followingCount

Quando si fa unfollow nella tab "following", dobbiamo anche aggiornare il counter:

```tsx
// In unfollowUserKeepInList, aggiungere dopo successo:
if (!error) {
  onFollowChange?.();
  setFollowingCount(prev => Math.max(0, prev - 1));
}
```

### 4. Aggiornare counter anche su follow

```tsx
// In followUser, dopo successo:
if (!error) {
  onFollowChange?.();
  setFollowingCount(prev => prev + 1);
}
```

## Flusso Corretto Dopo la Fix

```
Click unfollow:
  1. Haptic feedback
  2. Optimistic update (cache aggiornata)
  3. UI mostra immediatamente icona + (follow)
  4. Query al database in background
  5. Counter aggiornato
  6. NESSUN refetch/reload
```

## Quando Invalidare Veramente?

Solo quando necessario per sincronizzare dati che potrebbero essere cambiati da altri (es. quando si riapre il modal dopo un po'):

```tsx
// Nel useFollowList hook, lo staleTime di 60s già gestisce questo
staleTime: 60 * 1000, // Dopo 1 minuto, i dati verranno refreshati automaticamente
```

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/components/profile/FollowersModal.tsx` | Rimuovere `invalidateQueries` da `followUser` e `removeFollower`, aggiungere update dei counter |

## Codice Completo delle Modifiche

### followUser (linee 178-206)

```tsx
const followUser = async (targetId: string) => {
  if (!currentUser) return;

  try {
    // Optimistic update
    updateFollowerStatus(targetId, true);
    updateFollowingStatus(targetId, true);
    
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: currentUser.id,
        following_id: targetId,
      });

    if (error) {
      // Revert on error
      updateFollowerStatus(targetId, false);
      updateFollowingStatus(targetId, false);
      console.error('Error following user:', error);
    } else {
      // Update counter
      setFollowingCount(prev => prev + 1);
      onFollowChange?.();
      // NO invalidateQueries - optimistic update is sufficient
    }
  } catch (error) {
    console.error('Error following user:', error);
  }
};
```

### unfollowUserKeepInList (linee 208-235)

```tsx
const unfollowUserKeepInList = async (targetId: string) => {
  if (!currentUser) return;

  try {
    // Optimistic update - only update isFollowing status, don't remove from list
    updateFollowerStatus(targetId, false);
    updateFollowingStatus(targetId, false);
    
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetId);

    if (error) {
      // Revert on error
      updateFollowerStatus(targetId, true);
      updateFollowingStatus(targetId, true);
      console.error('Error unfollowing user:', error);
    } else {
      // Update counter
      setFollowingCount(prev => Math.max(0, prev - 1));
      onFollowChange?.();
      // NO invalidateQueries - user stays in list with + icon
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
  }
};
```

### removeFollower (linee 273-292)

```tsx
const removeFollower = async (followerId: string) => {
  if (!currentUser) return;

  try {
    const { error } = await supabase.rpc('remove_follower', {
      follower_user_id: followerId
    });

    if (!error) {
      removeFollowerFromList(followerId);
      setFollowersCount(prev => Math.max(0, prev - 1));
      onFollowChange?.();
      // NO invalidateQueries - optimistic update already done
    } else {
      console.error('Error removing follower:', error);
    }
  } catch (error) {
    console.error('Error removing follower:', error);
  }
};
```

## Impatto

| Azione | Prima | Dopo |
|--------|-------|------|
| Unfollow pubblico | Reload con spinner ~500ms | Istantaneo |
| Unfollow privato (con dialog) | Reload con spinner ~500ms | Istantaneo |
| Follow | Reload con spinner ~500ms | Istantaneo |
| Rimuovi follower | Reload con spinner ~500ms | Istantaneo |

