

## Piano: Fase 4 - Fix Timing Icona Centratura + Spinner Rimanenti

---

### Parte 1: Correzione Timing Icona Centratura in SearchDrawer.tsx

**Problema Attuale:**
L'icona di centratura appare solo dopo che l'animazione del logo è completamente finita (4 secondi + 800ms di pausa = circa 5 secondi totali). Il codice attuale (linea 192-193) imposta `setShowCenterIcon(true)` solo al termine dell'animazione.

**Soluzione:**
Mostrare l'icona **immediatamente** quando `logoSlideProgress` raggiunge 1 (logo completamente sparito), senza attendere la fine del delay. Possiamo farlo aggiungendo un check durante l'animazione stessa.

**Implementazione:**
```tsx
// Modifica in SearchDrawer.tsx (linee 180-194)
const animate = () => {
  const elapsed = Date.now() - startTime;
  const progress = Math.min(elapsed / duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  setLogoSlideProgress(eased);
  
  // Mostra l'icona di centratura non appena il logo è completamente fuori (eased >= 1)
  if (eased >= 1 && !showCenterIcon) {
    setShowCenterIcon(true);
  }
  
  if (progress < 1) {
    requestAnimationFrame(animate);
  } else {
    setShowLogoInBar(false);
  }
};
```

Questo garantisce che l'icona appaia **istantaneamente** quando il logo scompare, senza alcun ritardo.

---

### Parte 2: Spinner Rimanenti da Sostituire (15 file)

| File | Linea | Contesto | Soluzione |
|------|-------|----------|-----------|
| `src/components/MessagesModal.tsx` | 273-276, 322-325, 381-384 | Lista messaggi/thread/chat | Creare `MessagesListSkeleton` |
| `src/pages/business/PublicBusinessProfilePage.tsx` | 178-183 | Pagina profilo business pubblica | Usare `BusinessProfileSkeleton` |
| `src/pages/AdminAnalyticsPage.tsx` | 34-40 | Pagina analytics admin | Usare `AnalyticsSkeleton` |
| `src/pages/business/BusinessMessagesPage.tsx` | 216-219 | Lista messaggi business | Usare `MessagesListSkeleton` |
| `src/components/booking/BookingModal.tsx` | 153-157 | Time slots loading | Creare `TimeSlotsSkeleton` inline |
| `src/components/explore/LocationShareModal.tsx` | 274-277 | Lista utenti share | Usare `UserListSkeleton` |

---

### Nuovo Componente Skeleton da Creare

**`src/components/common/skeletons/MessagesListSkeleton.tsx`**
```
Struttura per thread messages:
- Avatar skeleton (48px)
- Username skeleton
- Message preview skeleton
- Timestamp skeleton
- Ripetere 5-6 volte con animazione shimmer staggerata
```

---

### Spinner da Mantenere (UX Appropriata)

Questi spinner rimangono perché sono feedback per azioni utente:

| File | Motivo |
|------|--------|
| `SignupStart.tsx` (linea 255, 280) | Check username inline |
| `AdminToolsSection.tsx` (linea 152) | Bottone "Esegui" tool |
| `SeedingDashboard.tsx` (linee 190, 204, 380, 387) | Bottoni avvio/in corso seeding |
| `LocationDataFix.tsx` | Bottoni scansione/correzione |
| `LocationShareModal.tsx` (linea 441) | Bottone invio |
| `PostsGrid.tsx` (linee 375, 578, 638) | Infinite scroll + bottone delete |
| `CityAutocompleteBar.tsx` (linea 225) | Search inline indicator |
| `GoogleMapsImportModal.tsx` | Bottone import |
| `EditProfileModal.tsx` | Bottone salvataggio |
| `InviteFriendOverlay.tsx` | Bottone invito |
| `ShareModal.tsx` (linea 280) | Bottone invio |

---

### File da Creare

1. `src/components/common/skeletons/MessagesListSkeleton.tsx`

### File da Modificare

1. `src/components/home/SearchDrawer.tsx` - Fix timing icona centratura
2. `src/components/MessagesModal.tsx` - Usare `MessagesListSkeleton` (3 posizioni)
3. `src/pages/business/PublicBusinessProfilePage.tsx` - Usare `BusinessProfileSkeleton`
4. `src/pages/AdminAnalyticsPage.tsx` - Usare `AnalyticsSkeleton`
5. `src/pages/business/BusinessMessagesPage.tsx` - Usare `MessagesListSkeleton`
6. `src/components/booking/BookingModal.tsx` - Skeleton inline per time slots
7. `src/components/explore/LocationShareModal.tsx` - Usare `UserListSkeleton`

---

### Risultato Atteso

Dopo queste modifiche:
- L'icona di centratura appare **istantaneamente** quando il logo scompare (zero delay)
- Tutti gli spinner di caricamento pagina/modale sostituiti con skeleton shimmer
- Percezione di velocità migliorata in tutta l'app
- Pattern consistente per tutti i loading state

