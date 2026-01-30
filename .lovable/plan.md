

## Piano: Fase 3 - Sostituzione Spinner Rimanenti + Miglioramento Logo Sliding

---

### Parte 1: Spinner Rimanenti da Sostituire (10 file)

| File | Riga | Stato Attuale | Soluzione |
|------|------|---------------|-----------|
| `src/components/notifications/NotificationsOverlay.tsx` | 257-262 | Spinner notifiche | `NotificationsSkeleton` |
| `src/components/settings/CloseFriendsModal.tsx` | 161-164 | Spinner lista amici | `UserListSkeleton` |
| `src/components/explore/PostDetailModal.tsx` | 322-330 | Spinner modale post | Creare `PostDetailSkeleton` |
| `src/components/explore/SearchResults.tsx` | 33-41 | Spinner ricerca | `SearchResultsSkeleton` |
| `src/components/home/QuickAddPinModal.tsx` | 341-347 | Spinner luoghi | `LocationCardsSkeleton` |
| `src/components/explore/LocationContributionModal.tsx` | 539-543, 660-663 | Spinner foto/folders | Skeleton inline |
| `src/components/explore/LeafletExploreMap.tsx` | 269-276 | Spinner mappa | `MapLoadingSkeleton` |

---

### Parte 2: Miglioramento Logo Sliding nella Search Bar

**Problema Attuale:**
L'icona di centratura (Navigation2) usa `opacity: logoSlideProgress`, il che significa che inizia a comparire subito quando il logo inizia a scivolare, creando una sovrapposizione visiva confusa.

**Soluzione:**
Mostrare l'icona di centratura SOLO dopo che il logo è completamente sparito (quando `logoSlideProgress === 1`), usando una transizione di fade-in separata.

**Implementazione in `SearchDrawer.tsx`:**

```tsx
// Stato per controllare quando l'icona può apparire
const [showCenterIcon, setShowCenterIcon] = useState(!showBrandingLogo);

// Aggiornare useEffect per settare showCenterIcon quando l'animazione è completa
useEffect(() => {
  if (showBrandingLogo) {
    setShowCenterIcon(false);
    // ... resto dell'animazione del logo ...
    // Al termine dell'animazione:
    setShowCenterIcon(true);
  }
}, [showBrandingLogo]);

// Nel JSX, avvolgere l'icona con una transizione separata:
<button
  onClick={(e) => {
    e.stopPropagation();
    handleCurrentLocation(e);
  }}
  disabled={geoLoading || !showCenterIcon}
  className="p-2 mr-3 hover:bg-white/10 dark:hover:bg-black/10 rounded-full transition-all duration-300 disabled:opacity-50 pointer-events-auto"
  style={{
    opacity: showCenterIcon ? 1 : 0,
    transform: showCenterIcon ? 'scale(1)' : 'scale(0.8)',
    pointerEvents: showCenterIcon ? 'auto' : 'none',
  }}
>
  <Navigation2 ... />
</button>
```

---

### Nuovi Componenti Skeleton da Creare

**1. `src/components/common/skeletons/PostDetailSkeleton.tsx`**
```
Struttura:
- Header skeleton (avatar + username)
- Immagine grande skeleton
- Riga azioni skeleton
- Caption skeleton
- Commenti skeleton (3 righe)
```

**2. `src/components/common/skeletons/MapLoadingSkeleton.tsx`**
```
Struttura:
- Sfondo grigio con pattern a tile
- Pulsante shimmer in alto a sinistra
- Animazione pulse leggera
```

---

### File da Creare

1. `src/components/common/skeletons/PostDetailSkeleton.tsx`
2. `src/components/common/skeletons/MapLoadingSkeleton.tsx`

### File da Modificare

1. `src/components/notifications/NotificationsOverlay.tsx` - Usare `NotificationsSkeleton`
2. `src/components/settings/CloseFriendsModal.tsx` - Usare `UserListSkeleton`
3. `src/components/explore/PostDetailModal.tsx` - Usare `PostDetailSkeleton`
4. `src/components/explore/SearchResults.tsx` - Usare `SearchResultsSkeleton`
5. `src/components/home/QuickAddPinModal.tsx` - Usare `LocationCardsSkeleton`
6. `src/components/explore/LocationContributionModal.tsx` - Skeleton inline per foto e folders
7. `src/components/explore/LeafletExploreMap.tsx` - Usare `MapLoadingSkeleton`
8. `src/components/home/SearchDrawer.tsx` - Migliorare timing icona centratura

---

### Spinner che Rimangono (Appropriati per UX)

Questi spinner sono appropriati e non verranno modificati:

| File | Motivo |
|------|--------|
| `QuickAddPinModal.tsx` (riga 416) | Spinner dentro bottone "Save" durante azione |
| `CloseFriendsModal.tsx` (righe 204, 240) | Spinner bottoni "Add/Remove" durante azione |
| `LocationContributionModal.tsx` (riga 763) | Spinner bottone "Share" durante invio |
| `InviteFriendOverlay.tsx` | Spinner bottone durante invio invito |
| `EditProfileModal.tsx` | Spinner bottone durante salvataggio |
| `PostEditor.tsx` | Spinner bottone "Sharing..." durante pubblicazione |

---

### Risultato Atteso

Dopo queste modifiche:
- **Zero spinner** visibili durante il caricamento di pagine/modali
- L'icona di centratura appare **solo dopo** che il logo è completamente scomparso
- Transizione fluida con fade-in dell'icona
- Skeleton shimmer consistenti in tutta l'app
- Percezione di velocità migliorata

