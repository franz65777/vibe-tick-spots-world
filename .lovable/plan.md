
# Piano: Miglioramento Pulsanti Segui/Rimuovi in Follower/Seguiti

## Requisiti

1. **Pagina Seguiti (Following Tab)**:
   - Quando si smette di seguire qualcuno (click sul ✓ verde), **mantenere il profilo visibile** nella lista
   - Cambiare l'icona da ✓ (verde) a + (blu) per permettere di seguire nuovamente
   - Se il profilo è **privato**, mostrare dialogo di conferma prima di smettere di seguire

2. **Pagina Follower (Followers Tab)**:
   - Mostrare dialogo di conferma prima di rimuovere un follower

3. **Profili Privati**:
   - Quando si smette di seguire un profilo privato e si vuole ri-seguire, **non bypassare** il processo di accettazione
   - L'utente deve inviare una nuova richiesta di follow che necessita approvazione

## Analisi Tecnica

### Stato Attuale
- `FollowersModal.tsx` non include informazione `is_private` per gli utenti nella lista
- L'unfollow rimuove l'utente dalla lista (comportamento attuale non desiderato per la tab "following")
- Non c'è dialogo di conferma per rimuovere follower
- `UnfollowConfirmDialog.tsx` esiste già e può essere riutilizzato

### Modifiche Necessarie

**1. Estendere `useFollowList.ts` per includere `is_private`**

```tsx
export interface FollowUser {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing: boolean;
  savedPlacesCount: number;
  isPrivate: boolean;  // <- NUOVO
}

// Nella queryFn, aggiungere fetch dei privacy settings
const [savedPlacesResult, userSavedLocsResult, followingStatusResult, privacyResult] = await Promise.all([
  // ... existing queries ...
  supabase
    .from('user_privacy_settings')
    .select('user_id, is_private')
    .in('user_id', userIds),
]);

// Creare Map per privacy
const privacyMap = new Map<string, boolean>();
(privacyResult.data || []).forEach((p: any) => {
  privacyMap.set(p.user_id, p.is_private ?? false);
});

// Nel return
return users.map((u: any) => ({
  // ... existing fields ...
  isPrivate: privacyMap.get(u.id) ?? false,
}));
```

**2. Creare `RemoveFollowerConfirmDialog.tsx`**

Nuovo componente simile a `UnfollowConfirmDialog` ma con testo specifico per la rimozione follower:

```tsx
// src/components/profile/RemoveFollowerConfirmDialog.tsx
interface RemoveFollowerConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  avatarUrl: string | null;
  username: string;
}

export const RemoveFollowerConfirmDialog: React.FC<RemoveFollowerConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  avatarUrl,
  username,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm bg-background rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <Avatar className="w-20 h-20 border-2 border-background mb-4">
            <AvatarImage src={avatarUrl || undefined} alt={username} />
            <AvatarFallback>{username?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <p className="text-center text-foreground text-base leading-relaxed">
            {t('userProfile.removeFollowerConfirmMessage', { 
              ns: 'common',
              username: username,
              defaultValue: `Vuoi rimuovere ${username} dai tuoi follower?`
            })}
          </p>
        </div>
        
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button onClick={onConfirm} className="w-full py-3.5 bg-destructive/10 text-destructive font-semibold text-base rounded-2xl">
            {t('userProfile.removeFollower', { ns: 'common', defaultValue: 'Rimuovi' })}
          </button>
          <button onClick={onClose} className="w-full py-3.5 bg-muted text-foreground font-medium text-base rounded-2xl">
            {t('userProfile.cancel', { ns: 'common' })}
          </button>
        </div>
      </div>
    </div>
  );
};
```

**3. Modificare `FollowersModal.tsx`**

Aggiungere stato per dialog di conferma e modificare logica:

```tsx
// Nuovi stati
const [confirmDialog, setConfirmDialog] = useState<{
  type: 'unfollow' | 'remove-follower' | null;
  user: UserWithFollowStatus | null;
}>({ type: null, user: null });

// In UserGridCard, modificare handleActionClick
const handleActionClick = async (e: React.MouseEvent) => {
  e.stopPropagation();
  haptics.selection();
  setIsAnimating(true);
  setTimeout(() => setIsAnimating(false), 200);
  
  if (isOwnProfile && activeTab === 'followers') {
    // Rimuovere follower - SEMPRE mostrare conferma
    setConfirmDialog({ type: 'remove-follower', user });
  } else if (user.isFollowing) {
    // Smettere di seguire
    if (user.isPrivate) {
      // Profilo privato - mostrare conferma
      setConfirmDialog({ type: 'unfollow', user });
    } else {
      // Profilo pubblico - unfollow diretto ma MANTIENI nella lista
      await handleUnfollowKeepInList(user.id);
    }
  } else {
    // Seguire
    if (user.isPrivate) {
      // Inviare richiesta di follow (NON bypass)
      await sendFollowRequest(user.id);
    } else {
      await followUser(user.id);
    }
  }
};

// Nuova funzione per unfollow che mantiene l'utente nella lista
const handleUnfollowKeepInList = async (targetId: string) => {
  try {
    // Aggiorna solo lo stato isFollowing, NON rimuovere dalla lista
    updateFollowingStatus(targetId, false);
    
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetId);

    if (error) {
      updateFollowingStatus(targetId, true);
      console.error('Error unfollowing:', error);
    } else {
      onFollowChange?.();
    }
  } catch (error) {
    console.error('Error unfollowing:', error);
  }
};

// Nuova funzione per inviare richiesta follow (profili privati)
const sendFollowRequest = async (targetId: string) => {
  try {
    // Creare friend_request invece di follow diretto
    const { error } = await supabase
      .from('friend_requests')
      .insert({
        requester_id: currentUser.id,
        requested_id: targetId,
        status: 'pending',
      });

    if (error) {
      console.error('Error sending follow request:', error);
      return;
    }

    // Aggiornare UI per mostrare stato "pending"
    // L'icona cambierà da + a un indicatore di "richiesta inviata"
    toast.success(t('userProfile.requestSent', { ns: 'common' }));
  } catch (error) {
    console.error('Error sending follow request:', error);
  }
};
```

**4. Aggiungere stato `followRequestPending` all'interfaccia**

```tsx
export interface FollowUser {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing: boolean;
  savedPlacesCount: number;
  isPrivate: boolean;
  followRequestPending?: boolean;  // <- per mostrare icona diversa
}
```

**5. Modificare icona overlay per richieste pending**

```tsx
const getActionIcon = () => {
  if (isOwnProfile && activeTab === 'followers') {
    return { icon: X, color: 'bg-destructive', hoverColor: 'hover:bg-destructive/90' };
  }
  if (user.isFollowing) {
    return { icon: Check, color: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-600' };
  }
  if (user.followRequestPending) {
    // Richiesta inviata - icona orologio/pending
    return { icon: Clock, color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600' };
  }
  return { icon: UserPlus, color: 'bg-primary', hoverColor: 'hover:bg-primary/90' };
};
```

## Flusso Utente Finale

### Tab "Seguiti" (Following)
```
Click ✓ verde su profilo pubblico:
  → Smette di seguire
  → Profilo RESTA nella lista con icona +
  → Click + per ri-seguire istantaneamente

Click ✓ verde su profilo privato:
  → Mostra dialogo conferma: "Smettere di seguire @username?"
  → Se conferma: profilo resta con icona +
  → Click + invia RICHIESTA (non follow diretto)
  → Icona diventa ⏱ (pending)
```

### Tab "Follower"
```
Click X rosso su qualsiasi follower:
  → Mostra dialogo conferma: "Rimuovere @username dai follower?"
  → Se conferma: rimuove dalla lista
```

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/hooks/useFollowList.ts` | Aggiungere `isPrivate` e `followRequestPending` alla query |
| `src/components/profile/FollowersModal.tsx` | Logica dialoghi, mantenere utenti in lista, richieste follow |
| `src/components/profile/RemoveFollowerConfirmDialog.tsx` | **NUOVO** - Dialogo conferma rimozione follower |

## Note Tecniche

1. **Cache Invalidation**: Dopo unfollow su profilo privato, non invalidare subito la cache per permettere di vedere l'icona + aggiornata
2. **Richieste Pending**: Per determinare se c'è una richiesta pending, dobbiamo fare una query aggiuntiva alla tabella `friend_requests`
3. **Traduzioni**: Aggiungere nuove chiavi i18n per i messaggi dei dialoghi
