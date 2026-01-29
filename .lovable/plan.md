

## Applicare lo Sfondo "Mappa con Blur" a Explore, Feed, Leaderboard e Profile

### Il Problema
L'effetto frosted glass della pagina Notifications funziona perché è un **overlay a portale** posizionato sopra la mappa (Home page). Il `backdrop-blur-xl` sfuma la mappa colorata sottostante.

Le pagine Explore, Feed, Leaderboard e Profile sono **rotte separate** - quando ci navighi, la mappa viene smontata e non c'è nulla da sfumare. Per questo i tentativi precedenti non hanno funzionato.

### Soluzione
Convertire queste 4 pagine in **overlay** come NotificationsOverlay e MessagesOverlay:

1. Creare context provider per ogni pagina (ExploreOverlayContext, FeedOverlayContext, ecc.)
2. Creare componenti overlay per ogni pagina
3. Montare gli overlay nel AuthenticatedLayout sopra la mappa
4. Modificare la navigazione per aprire overlay invece di cambiare rotta

---

### Modifiche Tecniche

#### 1. Creare ExploreOverlayContext (nuovo file)

```text
src/contexts/ExploreOverlayContext.tsx
```

Context che gestisce apertura/chiusura dell'overlay Explore, navigando sempre alla Home (mappa) quando aperto.

---

#### 2. Creare FeedOverlayContext (nuovo file)

```text
src/contexts/FeedOverlayContext.tsx
```

Context per la pagina Feed.

---

#### 3. Creare ProfileOverlayContext (nuovo file)

```text
src/contexts/ProfileOverlayContext.tsx
```

Context per la pagina Profile.

---

#### 4. Creare LeaderboardOverlayContext (nuovo file)

```text
src/contexts/LeaderboardOverlayContext.tsx
```

Context per la pagina Leaderboard.

---

#### 5. Convertire ExplorePage in ExploreOverlay

Modificare il componente per:
- Usare `createPortal` per renderizzare a livello `<body>`
- Applicare lo stesso sfondo delle notifiche: `bg-background/40 backdrop-blur-xl`
- Aggiungere z-index alto (simile a NotificationsOverlay)

**Struttura del wrapper:**
```tsx
<div className="fixed inset-0 z-[2147483640] flex flex-col bg-background/40 backdrop-blur-xl">
  {/* Header e contenuto esistenti */}
</div>
```

---

#### 6. Convertire FeedPage in FeedOverlay

Stesso approccio di ExplorePage.

---

#### 7. Convertire ProfilePage in ProfileOverlay

Stesso approccio.

---

#### 8. Convertire LeaderboardPage in LeaderboardOverlay

Stesso approccio.

---

#### 9. Aggiornare AuthenticatedLayout

Aggiungere i nuovi provider e montare i nuovi overlay:

```tsx
<ExploreOverlayProvider>
  <FeedOverlayProvider>
    <ProfileOverlayProvider>
      <LeaderboardOverlayProvider>
        ...
        <ExploreOverlay />
        <FeedOverlay />
        <ProfileOverlay />
        <LeaderboardOverlay />
      </LeaderboardOverlayProvider>
    </ProfileOverlayProvider>
  </FeedOverlayProvider>
</ExploreOverlayProvider>
```

---

#### 10. Aggiornare NewBottomNavigation

Modificare i click sui tab per aprire gli overlay invece di navigare a rotte separate:

- Tab Explore → `openExploreOverlay()` invece di `navigate('/explore')`
- Tab Feed → `openFeedOverlay()` invece di `navigate('/feed')`
- Tab Profile → `openProfileOverlay()` invece di `navigate('/profile')`

---

### File da Creare

| File | Descrizione |
|------|-------------|
| `src/contexts/ExploreOverlayContext.tsx` | Context per gestire overlay Explore |
| `src/contexts/FeedOverlayContext.tsx` | Context per gestire overlay Feed |
| `src/contexts/ProfileOverlayContext.tsx` | Context per gestire overlay Profile |
| `src/contexts/LeaderboardOverlayContext.tsx` | Context per gestire overlay Leaderboard |
| `src/components/explore/ExploreOverlay.tsx` | Overlay wrapper per Explore |
| `src/components/feed/FeedOverlay.tsx` | Overlay wrapper per Feed |
| `src/components/profile/ProfileOverlay.tsx` | Overlay wrapper per Profile |
| `src/components/leaderboard/LeaderboardOverlay.tsx` | Overlay wrapper per Leaderboard |

---

### File da Modificare

| File | Modifica |
|------|----------|
| `src/components/AuthenticatedLayout.tsx` | Aggiungere provider e overlay |
| `src/components/NewBottomNavigation.tsx` | Usare context overlay invece di navigate |
| `src/components/ExplorePage.tsx` | Rimuovere sfondo simulato (sarà nell'overlay) |
| `src/pages/FeedPage.tsx` | Rimuovere sfondo simulato |
| `src/pages/LeaderboardPage.tsx` | Rimuovere sfondo bg-background |
| `src/components/ProfilePage.tsx` | Rimuovere sfondo bg-background |

---

### Come Funziona

```text
┌─────────────────────────────────────┐
│         Home Page (Mappa)           │ ← Sempre montata
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Overlay (Portal)        │    │
│  │  bg-background/40           │    │
│  │  backdrop-blur-xl           │    │ ← Sfuma la mappa
│  │                             │    │
│  │  [Explore/Feed/Profile/     │    │
│  │   Leaderboard Content]      │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

La mappa rimane sempre visibile e montata. Gli overlay si sovrappongono con il blur, creando l'effetto vetro smerigliato identico a Notifications.

---

### Vantaggi

1. **Stesso effetto visivo** delle Notifications - identico `backdrop-blur-xl`
2. **Performance migliori** - la mappa resta montata, transizioni istantanee
3. **Coerenza UI** - tutte le sezioni principali hanno lo stesso stile
4. **Architettura pulita** - pattern già collaudato con Notifications e Messages

