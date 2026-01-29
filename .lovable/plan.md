
## Aggiungere Effetto Blur "Frosted Glass" alle Pagine (Explore, Feed, Profile, Leaderboard)

### Obiettivo
Replicare l'effetto visivo "Per te" della foto 2: uno sfondo off-white/crema con un sottile effetto vetro smerigliato che dà un aspetto morbido e sfumato.

### Approccio Tecnico
Creare un effetto multi-layer simile agli overlay, ma con gradienti colorati sottili come base invece della mappa:

1. **Layer base colorato**: Gradienti sfumati blu/viola/rosa molto tenui che simulano colori sotto il blur
2. **Layer frosted glass**: `bg-[#FAF9F7]/80 backdrop-blur-xl` sopra il layer colorato
3. **Contenuto**: Z-index superiore per il contenuto della pagina

```text
┌─────────────────────────────────────┐
│  Layer 1: Gradienti colorati tenui  │ ← Base (z-0)
├─────────────────────────────────────┤
│  Layer 2: Off-white/80 blur-xl      │ ← Frosted glass (z-[1])
├─────────────────────────────────────┤
│  Layer 3: Contenuto pagina          │ ← Content (z-10)
└─────────────────────────────────────┘
```

---

### Modifiche Tecniche

#### 1. ExplorePage.tsx (riga 439)

```tsx
// DA
<div className="relative flex flex-col h-full pt-[env(safe-area-inset-top)] pb-0 bg-[#FAF9F7] dark:bg-background">

// A
<div className="relative flex flex-col h-full pt-[env(safe-area-inset-top)] pb-0">
  {/* Subtle gradient base */}
  <div className="absolute inset-0 z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/20 dark:via-purple-950/15 dark:to-pink-950/20" />
  </div>
  {/* Frosted glass overlay */}
  <div className="absolute inset-0 z-[1] bg-[#FAF9F7]/80 dark:bg-background/80 backdrop-blur-xl" />
  {/* Content wrapper */}
  <div className="relative z-10 flex flex-col h-full">
    {/* ... tutto il contenuto esistente ... */}
  </div>
</div>
```

---

#### 2. FeedPage.tsx (riga 541)

```tsx
// DA
<div className="relative h-screen flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] bg-[#FAF9F7] dark:bg-background">

// A
<div className="relative h-screen flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
  {/* Subtle gradient base */}
  <div className="fixed inset-0 z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/20 dark:via-purple-950/15 dark:to-pink-950/20" />
  </div>
  {/* Frosted glass overlay */}
  <div className="fixed inset-0 z-[1] bg-[#FAF9F7]/80 dark:bg-background/80 backdrop-blur-xl" />
  {/* Content wrapper */}
  <div className="relative z-10 h-full flex flex-col overflow-hidden">
    {/* ... tutto il contenuto esistente ... */}
  </div>
</div>
```

---

#### 3. ProfilePage.tsx (riga 158)

```tsx
// DA
<div className="flex flex-col h-full pt-[env(safe-area-inset-top)] bg-[#FAF9F7] dark:bg-background">

// A
<div className="relative flex flex-col h-full pt-[env(safe-area-inset-top)]">
  {/* Subtle gradient base */}
  <div className="absolute inset-0 z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/20 dark:via-purple-950/15 dark:to-pink-950/20" />
  </div>
  {/* Frosted glass overlay */}
  <div className="absolute inset-0 z-[1] bg-[#FAF9F7]/80 dark:bg-background/80 backdrop-blur-xl" />
  {/* Content wrapper */}
  <div className="relative z-10 flex flex-col h-full">
    {/* ... tutto il contenuto esistente ... */}
  </div>
</div>
```

---

#### 4. LeaderboardPage.tsx (riga 48)

```tsx
// DA
<div className="min-h-screen pb-safe bg-[#FAF9F7] dark:bg-background">

// A
<div className="relative min-h-screen pb-safe">
  {/* Subtle gradient base */}
  <div className="fixed inset-0 z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/20 dark:via-purple-950/15 dark:to-pink-950/20" />
  </div>
  {/* Frosted glass overlay */}
  <div className="fixed inset-0 z-[1] bg-[#FAF9F7]/80 dark:bg-background/80 backdrop-blur-xl" />
  {/* Content wrapper */}
  <div className="relative z-10 min-h-screen pb-safe">
    {/* ... tutto il contenuto esistente ... */}
  </div>
</div>
```

---

### File da Modificare

| File | Riga | Modifica |
|------|------|----------|
| `src/components/ExplorePage.tsx` | 439 | Aggiungere layer gradient + frosted overlay |
| `src/pages/FeedPage.tsx` | 541 | Aggiungere layer gradient + frosted overlay |
| `src/components/ProfilePage.tsx` | 158 | Aggiungere layer gradient + frosted overlay |
| `src/pages/LeaderboardPage.tsx` | 48 | Aggiungere layer gradient + frosted overlay |

---

### Vantaggi di questo Approccio

1. **Nessun cambio di architettura** - le pagine restano come rotte standard
2. **Effetto blur visibile** - il gradiente sotto viene sfumato creando l'effetto vetro
3. **Performance leggera** - solo CSS, nessun componente aggiuntivo
4. **Coerenza visiva** - stesso "look" della foto "Per te"
5. **Dark mode supportata** - colori adattati per tema scuro
