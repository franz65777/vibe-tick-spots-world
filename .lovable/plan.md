

## Piano: Fase 5 - Fix Definitivo Timing Icona Centratura + Spinner Rimanenti

---

### Parte 1: FIX CRITICO - Timing Icona Centratura

**Problema Identificato:**
Il codice attuale in `SearchDrawer.tsx` (linee 176-201) ha:
1. Un delay iniziale di **800ms** prima che l'animazione inizi (`setTimeout(..., 800)`)
2. Un'animazione di **4000ms** per far scorrere il logo
3. Totale: **4.8 secondi** prima che l'icona appaia

**Soluzione:**
Ridurre drasticamente i tempi e mostrare l'icona appena il logo inizia a scomparire (quando raggiunge ~50% di avanzamento):

```tsx
// Modifica in SearchDrawer.tsx
useEffect(() => {
  if (showBrandingLogo) {
    setShowLogoInBar(true);
    setLogoSlideProgress(0);
    setShowCenterIcon(false);
    
    // Ridurre il delay iniziale da 800ms a 200ms
    const startDelay = setTimeout(() => {
      const startTime = Date.now();
      const duration = 2000; // Ridotto da 4000ms a 2000ms
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setLogoSlideProgress(eased);
        
        // Mostra icona quando il logo è al 60% del percorso (sparisce dalla vista)
        if (eased >= 0.6 && !showCenterIcon) {
          setShowCenterIcon(true);
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setShowLogoInBar(false);
        }
      };
      
      requestAnimationFrame(animate);
    }, 200); // Ridotto da 800ms
    
    return () => clearTimeout(startDelay);
  }
}, [showBrandingLogo]);
```

**Risultato:** L'icona apparirà dopo circa **1.4 secondi** invece di 4.8 secondi.

---

### Parte 2: Spinner Rimanenti da Sostituire (12 file)

Ho identificato altri 12 file con spinner che dovrebbero usare skeleton:

| File | Linea | Contesto | Soluzione |
|------|-------|----------|-----------|
| `FriendRequestsModal.tsx` | 74-77 | Lista richieste amicizia | `UserListSkeleton` |
| `PrivacySettingsModal.tsx` | 136-139 | Settings privacy | `SettingsSkeleton` |
| `MessagesOverlay.tsx` | 791-794, 825-828 | Contatti frequenti/suggeriti | Skeleton avatar circolari inline |
| `AddPageOverlay.tsx` | 191-194 | Ricerca luoghi | `SearchResultsSkeleton` |
| `CommentModal.tsx` | 186 | Bottone invio commento | Mantenere (azione) |

---

### Nuovo Componente Skeleton da Creare

**`src/components/common/skeletons/AvatarGridSkeleton.tsx`**
```tsx
// Per MessagesOverlay - contatti frequenti/suggeriti
// Struttura:
- Griglia di 4-6 avatar circolari (64px)
- Username skeleton sotto ogni avatar
- Animazione shimmer staggerata
```

---

### File da Creare

1. `src/components/common/skeletons/AvatarGridSkeleton.tsx`

### File da Modificare

1. `src/components/home/SearchDrawer.tsx` - Fix timing (delay 200ms, duration 2000ms, threshold 0.6)
2. `src/components/FriendRequestsModal.tsx` - Usare `UserListSkeleton`
3. `src/components/settings/PrivacySettingsModal.tsx` - Usare `SettingsSkeleton`
4. `src/components/messages/MessagesOverlay.tsx` - Usare `AvatarGridSkeleton` per contatti
5. `src/components/add/AddPageOverlay.tsx` - Usare `SearchResultsSkeleton`

---

### Spinner Appropriati (da Mantenere)

Questi spinner sono feedback per azioni utente e rimangono:

| File | Motivo |
|------|--------|
| `CommentModal.tsx` (linea 186) | Bottone invio commento |
| `SeedingDashboard.tsx` | Bottoni avvio/in corso seeding |
| `PostsGrid.tsx` | Infinite scroll + bottone delete |
| `AdminToolsSection.tsx` | Bottone "Esegui" |
| Tutti i bottoni "Save", "Share", "Send" | Feedback azione |

---

### Risultato Atteso

Dopo queste modifiche:
- L'icona di centratura appare **entro 1.5 secondi** dall'apertura app (riduzione del 70%)
- Tutti gli spinner di caricamento contenuti sostituiti con skeleton shimmer
- UX consistente in tutta l'applicazione
- Percezione di velocità notevolmente migliorata

